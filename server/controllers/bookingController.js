const { v4: uuidv4 }      = require('uuid');
const { getClient }       = require('../config/database');
const BookingModel        = require('../models/BookingModel');
const TicketTypeModel     = require('../models/TicketTypeModel');
const TicketModel         = require('../models/TicketModel');
const PaymentModel        = require('../models/PaymentModel');
const PromotionModel      = require('../models/PromotionModel');
const AttractionModel     = require('../models/AttractionModel');
const qrService           = require('../services/qrService');
const socketService       = require('../services/socketService');
const notificationService = require('../services/notificationService');
const { success, error, getPagination, paginate,
        generateBookingCode, generatePaymentCode,
        generateTicketCode, generateValidationToken, isWeekend } = require('../utils/helpers');

const bookingController = {
  // GET /api/bookings  (admin: all | customer: own)
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, status, attractionId, dateFrom, dateTo } = req.query;
      const userId = req.user.role === 'customer' ? req.user.id : req.query.userId;

      const { rows, total } = await BookingModel.findAll({
        limit, offset, search, status, userId, attractionId, dateFrom, dateTo,
      });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/bookings/:id
  async detail(req, res, next) {
    try {
      const booking = await BookingModel.findById(req.params.id);
      if (!booking) return error(res, 'Booking not found.', 404);
      if (req.user.role === 'customer' && booking.user_id !== req.user.id)
        return error(res, 'Forbidden.', 403);

      const [details, tickets, payments] = await Promise.all([
        BookingModel.getDetails(booking.id),
        TicketModel.findByBooking(booking.id),
        PaymentModel.findByBooking(booking.id),
      ]);

      return success(res, { booking, details, tickets, payments });
    } catch (err) { next(err); }
  },

  // POST /api/bookings  (customer)
  async create(req, res, next) {
    const client = await getClient();
    try {
      const { attractionId, visitDate, items, promoCode, notes } = req.body;
      // items = [{ ticketTypeId, quantity, visitorData }]

      if (!items || !items.length) return error(res, 'At least one ticket item is required.', 400);

      // Verify attraction
      const attraction = await AttractionModel.findById(attractionId);
      if (!attraction) return error(res, 'Attraction not found.', 404);
      if (!attraction.is_active) return error(res, 'Attraction is not active.', 400);

      // Determine pricing date type
      const weekend = isWeekend(visitDate);

      // Calculate subtotal and check quota
      let subtotal = 0;
      const itemsWithPricing = [];

      for (const item of items) {
        const tt = await TicketTypeModel.findById(item.ticketTypeId);
        if (!tt || !tt.is_active) return error(res, `Ticket type not found or inactive.`, 400);
        if (tt.attraction_id !== attractionId) return error(res, 'Ticket type does not belong to this attraction.', 400);

        const booked = await TicketTypeModel.getBookedCount(tt.id, visitDate);
        const remaining = tt.daily_quota - booked;
        if (item.quantity > remaining)
          return error(res, `Only ${remaining} tickets left for ${tt.name} on this date.`, 400);

        const unitPrice = weekend && tt.weekend_price
          ? parseFloat(tt.weekend_price)
          : parseFloat(tt.base_price);

        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;
        itemsWithPricing.push({ ...item, tt, unitPrice, itemSubtotal });
      }

      // Promo validation
      let discountAmount = 0;
      let promotionId = null;
      if (promoCode) {
        const promo = await PromotionModel.findByCode(promoCode);
        if (!promo) return error(res, 'Promo code not found.', 404);
        const result = PromotionModel.validate(promo, subtotal);
        if (!result.valid) return error(res, result.reason, 400);
        discountAmount = result.discount;
        promotionId = promo.id;
      }

      const totalAmount = subtotal - discountAmount;

      await client.query('BEGIN');

      // Create booking
      const bookingId   = uuidv4();
      const bookingCode = generateBookingCode();
      const booking = await BookingModel.create(client, {
        id: bookingId, bookingCode, userId: req.user.id,
        attractionId, promotionId, visitDate,
        subtotal, discountAmount, totalAmount, notes,
      });

      // Create booking details + tickets
      for (const item of itemsWithPricing) {
        const detailId = uuidv4();
        const detail = await BookingModel.addDetail(client, {
          id:           detailId,
          bookingId,
          ticketTypeId: item.ticketTypeId,
          quantity:     item.quantity,
          unitPrice:    item.unitPrice,
          subtotal:     item.itemSubtotal,
          visitorData:  item.visitorData || [],
        });

        // Generate one ticket per quantity
        for (let i = 0; i < item.quantity; i++) {
          const ticketId      = uuidv4();
          const ticketCode    = generateTicketCode();
          const validToken    = generateValidationToken();
          const visitDateObj  = new Date(visitDate);
          // Ticket expires at end of visit day
          const expiresAt = new Date(visitDateObj);
          expiresAt.setHours(23, 59, 59, 999);

          const ticketStub = {
            id: ticketId, ticketCode, bookingId,
            bookingDetailId: detailId,
            userId: req.user.id, attractionId,
            ticketTypeId: item.ticketTypeId,
            visitDate, validationToken: validToken,
            qrCode: null, qrData: null, expiresAt,
          };

          const { qrCode, qrData } = await qrService.generateTicketQR({ ...ticketStub });
          ticketStub.qrCode = qrCode;
          ticketStub.qrData = qrData;

          await TicketModel.create(client, ticketStub);
        }
      }

      // Create payment record
      const paymentId   = uuidv4();
      const paymentCode = generatePaymentCode();
      await PaymentModel.create(client, {
        id: paymentId, bookingId, paymentCode, amount: totalAmount,
      });

      // Increment promo usage
      if (promotionId) await client.query(
        `UPDATE promotions SET used_count=used_count+1 WHERE id=$1`, [promotionId]
      );

      await client.query('COMMIT');

      // Fetch full booking for response
      const fullBooking = await BookingModel.findById(bookingId);
      const details     = await BookingModel.getDetails(bookingId);
      const tickets     = await TicketModel.findByBooking(bookingId);
      const payments    = await PaymentModel.findByBooking(bookingId);

      // Socket events & notification (non-blocking)
      socketService.onBookingCreated({ ...fullBooking, attraction_name: attraction.name });
      notificationService.ticketReady(req.user.id, { ...fullBooking, attraction_name: attraction.name }).catch(() => {});

      return success(res, { booking: fullBooking, details, tickets, payments }, 'Booking created successfully.', 201);
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  },

  // PUT /api/bookings/:id/confirm  (admin)
  async confirm(req, res, next) {
    try {
      const booking = await BookingModel.findById(req.params.id);
      if (!booking) return error(res, 'Booking not found.', 404);
      if (booking.status !== 'pending') return error(res, `Cannot confirm a ${booking.status} booking.`, 400);

      const updated = await BookingModel.updateStatus(booking.id, 'confirmed');
      await BookingModel.updatePaymentStatus(booking.id, 'paid');

      socketService.onBookingConfirmed(updated);
      notificationService.bookingConfirmed(booking.user_id, { ...updated, attraction_name: booking.attraction_name }).catch(() => {});

      return success(res, { booking: updated }, 'Booking confirmed.');
    } catch (err) { next(err); }
  },

  // PUT /api/bookings/:id/cancel
  async cancel(req, res, next) {
    const client = await getClient();
    try {
      const booking = await BookingModel.findById(req.params.id);
      if (!booking) return error(res, 'Booking not found.', 404);

      // Customer can only cancel own bookings
      if (req.user.role === 'customer' && booking.user_id !== req.user.id)
        return error(res, 'Forbidden.', 403);
      if (!['pending', 'confirmed'].includes(booking.status))
        return error(res, `Cannot cancel a ${booking.status} booking.`, 400);

      await client.query('BEGIN');
      const updated = await BookingModel.updateStatus(booking.id, 'cancelled', {
        adminNotes: req.body.reason || null,
      });
      await TicketModel.cancelByBooking(client, booking.id);
      await client.query('COMMIT');

      socketService.onBookingCancelled(updated);
      notificationService.bookingCancelled(booking.user_id, { ...updated, attraction_name: booking.attraction_name }, req.body.reason).catch(() => {});

      return success(res, { booking: updated }, 'Booking cancelled.');
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  },

  // PUT /api/bookings/:id/complete  (admin)
  async complete(req, res, next) {
    try {
      const booking = await BookingModel.findById(req.params.id);
      if (!booking) return error(res, 'Booking not found.', 404);
      if (booking.status !== 'confirmed') return error(res, 'Booking must be confirmed first.', 400);
      const updated = await BookingModel.updateStatus(booking.id, 'completed');
      return success(res, { booking: updated }, 'Booking marked as completed.');
    } catch (err) { next(err); }
  },
};

module.exports = bookingController;
