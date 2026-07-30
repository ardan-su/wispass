/**
 * Booking/Order Controller – MariaDB edition
 * Ported from bookingController.js – all pg queries → mysql2, table renames
 */
const { v4: uuid }      = require('uuid');
const { transaction }   = require('../../config/database');
const OrderModel        = require('../tickets/OrderModel');
const TicketModel       = require('../tickets/TicketModel');
const { query }         = require('../../config/database');
const qrService         = require('../qr/qrService');
const socketSvc         = require('../../sockets/socketService');
const { success, error, getPagination, paginate,
        generateBookingCode, generatePaymentCode,
        generateTicketCode, generateValidationToken, isWeekend } = require('../../utils/helpers');
const logger = require('../../utils/logger');

// ─── Ticket Type helper ───────────────────────────────────────────────────────
async function getTicketType(id) {
  const rows = await query(`SELECT * FROM ticket_types WHERE id = ? AND is_active = 1`, [id]);
  return rows[0] || null;
}
async function getBookedCount(typeId, visitDate) {
  const rows = await query(
    `SELECT COALESCE(SUM(od.quantity),0) AS booked
     FROM order_details od
     JOIN ticket_orders o ON o.id = od.order_id
     WHERE od.ticket_type_id = ? AND o.visit_date = ? AND o.status NOT IN ('cancelled','refunded')`,
    [typeId, visitDate]
  );
  return parseInt(rows[0].booked);
}

// ─── Notification helper (non-blocking) ──────────────────────────────────────
async function sendNotification(userId, type, title, message, data = {}) {
  try {
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, data)
       VALUES (?,?,?,?,?,?)`,
      [uuid(), userId, type, title, message, JSON.stringify(data)]
    );
    socketSvc.onNewNotification && socketSvc.onNewNotification(userId, { type, title, message });
  } catch (e) { logger.error('sendNotification error:', e.message); }
}

const orderController = {
  // GET /api/bookings
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, status, siteId, dateFrom, dateTo } = req.query;
      const userId = req.user.role === 'customer' ? req.user.id : req.query.userId;

      const { rows, total } = await OrderModel.findAll({
        limit, offset, search, status, userId, siteId, dateFrom, dateTo,
      });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/bookings/:id
  async detail(req, res, next) {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) return error(res, 'Booking not found.', 404);
      if (req.user.role === 'customer' && order.user_id !== req.user.id)
        return error(res, 'Forbidden.', 403);

      const [details, tickets, payments] = await Promise.all([
        OrderModel.getDetails(order.id),
        TicketModel.findByOrder(order.id),
        query(`SELECT * FROM payments WHERE order_id = ?`, [order.id]),
      ]);

      return success(res, { booking: order, details, tickets, payments });
    } catch (err) { next(err); }
  },

  // POST /api/bookings
  async create(req, res, next) {
    try {
      const { attractionId, visitDate, items, promoCode, notes } = req.body;
      const siteId = attractionId; // alias

      if (!items || !items.length) return error(res, 'At least one ticket item is required.', 400);

      // Verify site
      const siteRows = await query(`SELECT * FROM tourist_sites WHERE id = ? AND is_active=1 AND deleted_at IS NULL`, [siteId]);
      if (!siteRows.length) return error(res, 'Attraction not found.', 404);

      const weekend = isWeekend(visitDate);
      let subtotal  = 0;
      const itemsWithPricing = [];

      for (const item of items) {
        const tt = await getTicketType(item.ticketTypeId);
        if (!tt) return error(res, 'Ticket type not found or inactive.', 400);
        if (tt.site_id !== siteId) return error(res, 'Ticket type does not belong to this attraction.', 400);

        const booked    = await getBookedCount(tt.id, visitDate);
        const remaining = tt.daily_quota - booked;
        if (item.quantity > remaining)
          return error(res, `Only ${remaining} tickets left for ${tt.name} on this date.`, 400);

        const unitPrice = (weekend && tt.weekend_price) ? parseFloat(tt.weekend_price) : parseFloat(tt.base_price);
        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;
        itemsWithPricing.push({ ...item, tt, unitPrice, itemSubtotal: itemTotal });
      }

      // Promo
      let discountAmount = 0, promotionId = null;
      if (promoCode) {
        const promos = await query(
          `SELECT * FROM promotions WHERE code = ? AND is_active=1 AND valid_from <= NOW() AND valid_until >= NOW()`,
          [promoCode]
        );
        if (!promos.length) return error(res, 'Promo code not found or expired.', 404);
        const promo = promos[0];
        if (subtotal < parseFloat(promo.min_purchase))
          return error(res, `Minimum purchase Rp${promo.min_purchase.toLocaleString()} required.`, 400);
        if (promo.usage_limit && promo.used_count >= promo.usage_limit)
          return error(res, 'Promo code has reached its usage limit.', 400);

        discountAmount = promo.discount_type === 'percentage'
          ? Math.min(subtotal * parseFloat(promo.discount_value) / 100, promo.max_discount || Infinity)
          : parseFloat(promo.discount_value);
        promotionId = promo.id;
      }

      const totalAmount = Math.max(0, subtotal - discountAmount);

      // Transaction
      const result = await transaction(async (conn) => {
        const orderId    = uuid();
        const bookingCode = generateBookingCode();

        const order = await OrderModel.create(conn, {
          id: orderId, bookingCode, userId: req.user.id,
          siteId, promotionId, visitDate,
          subtotal, discountAmount, totalAmount, notes,
        });

        for (const item of itemsWithPricing) {
          const detailId = uuid();
          const detail   = await OrderModel.addDetail(conn, {
            id: detailId, orderId, ticketTypeId: item.ticketTypeId,
            quantity: item.quantity, unitPrice: item.unitPrice,
            subtotal: item.itemSubtotal, visitorData: item.visitorData || [],
          });

          for (let i = 0; i < item.quantity; i++) {
            const ticketId    = uuid();
            const ticketCode  = generateTicketCode();
            const validToken  = generateValidationToken();
            const expiresAt   = new Date(`${visitDate}T23:59:59.999Z`);

            const stub = {
              id: ticketId, ticketCode, orderId, orderDetailId: detailId,
              userId: req.user.id, siteId, ticketTypeId: item.ticketTypeId,
              visitDate, validationToken: validToken, qrCode: null, qrData: null, expiresAt,
            };

            const { qrCode, qrData } = await qrService.generateTicketQR({
              ...stub, id: ticketId,
              ticket_code: ticketCode, order_id: orderId,
              user_id: stub.userId, site_id: siteId,
              ticket_type_id: item.ticketTypeId, visit_date: visitDate,
              validation_token: validToken,
            });
            stub.qrCode = qrCode;
            stub.qrData = qrData;

            await TicketModel.create(conn, stub);
          }
        }

        // Payment record
        const paymentId   = uuid();
        const paymentCode = generatePaymentCode();
        await conn.execute(
          `INSERT INTO payments (id, order_id, payment_code, amount) VALUES (?,?,?,?)`,
          [paymentId, orderId, paymentCode, totalAmount]
        );

        if (promotionId) {
          await conn.execute(`UPDATE promotions SET used_count=used_count+1 WHERE id=?`, [promotionId]);
        }

        return orderId;
      });

      const fullOrder  = await OrderModel.findById(result);
      const details    = await OrderModel.getDetails(result);
      const tickets    = await TicketModel.findByOrder(result);
      const payments   = await query(`SELECT * FROM payments WHERE order_id = ?`, [result]);

      socketSvc.onBookingCreated(fullOrder);
      sendNotification(req.user.id, 'ticket_ready', 'Tickets Ready!',
        `Your booking ${fullOrder.booking_code} is confirmed.`, { orderId: result });

      return success(res, { booking: fullOrder, details, tickets, payments }, 'Booking created successfully.', 201);
    } catch (err) { next(err); }
  },

  // PUT /api/bookings/:id/confirm
  async confirm(req, res, next) {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) return error(res, 'Booking not found.', 404);
      if (order.status !== 'pending') return error(res, `Cannot confirm a ${order.status} booking.`, 400);

      const updated = await OrderModel.updateStatus(order.id, 'confirmed');
      await OrderModel.updatePaymentStatus(order.id, 'paid');
      // Also update the payments table row so bookingDetail shows consistent status
      await query(`UPDATE payments SET status = 'paid', paid_at = NOW() WHERE order_id = ? AND status = 'pending'`, [order.id]);
      socketSvc.onBookingConfirmed(updated);
      sendNotification(order.user_id, 'booking_confirmed', 'Booking Confirmed',
        `Booking ${order.booking_code} has been confirmed.`);

      return success(res, { booking: updated }, 'Booking confirmed.');
    } catch (err) { next(err); }
  },

  // PUT /api/bookings/:id/cancel
  async cancel(req, res, next) {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) return error(res, 'Booking not found.', 404);
      if (req.user.role === 'customer' && order.user_id !== req.user.id)
        return error(res, 'Forbidden.', 403);
      if (!['pending','confirmed'].includes(order.status))
        return error(res, `Cannot cancel a ${order.status} booking.`, 400);

      await transaction(async (conn) => {
        await OrderModel.updateStatus(order.id, 'cancelled', { adminNotes: req.body.reason });
        await TicketModel.cancelByOrder(conn, order.id);
      });

      const updated = await OrderModel.findById(order.id);
      socketSvc.onBookingCancelled(updated);
      sendNotification(order.user_id, 'booking_cancelled', 'Booking Cancelled',
        `Booking ${order.booking_code} has been cancelled.`);

      return success(res, { booking: updated }, 'Booking cancelled.');
    } catch (err) { next(err); }
  },

  // PUT /api/bookings/:id/complete
  async complete(req, res, next) {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) return error(res, 'Booking not found.', 404);
      if (order.status !== 'confirmed') return error(res, 'Booking must be confirmed first.', 400);
      const updated = await OrderModel.updateStatus(order.id, 'completed');
      return success(res, { booking: updated }, 'Booking marked as completed.');
    } catch (err) { next(err); }
  },
};

module.exports = orderController;
