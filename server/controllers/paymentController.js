/**
 * Payment Controller
 * Full Midtrans QRIS integration with graceful fallback.
 */
const { v4: uuidv4 }      = require('uuid');
const QRCode              = require('qrcode');
const PaymentModel        = require('../models/PaymentModel');
const BookingModel        = require('../models/BookingModel');
const notificationService = require('../services/notificationService');
const socketService       = require('../services/socketService');
const logger              = require('../utils/logger');
const { success, error }  = require('../utils/helpers');

// ── Lazy-load midtrans so missing keys don't crash on startup ──
let midtrans = null;
function getMidtrans() {
  if (!midtrans) midtrans = require('../services/midtransService');
  return midtrans;
}

const isMidtransConfigured = () =>
  process.env.MIDTRANS_SERVER_KEY &&
  !process.env.MIDTRANS_SERVER_KEY.includes('xxxxxxx');

const paymentController = {

  // ── GET /api/payments/booking/:bookingId ──────────────────────
  async byBooking(req, res, next) {
    try {
      const booking = await BookingModel.findById(req.params.bookingId);
      if (!booking) return error(res, 'Booking not found.', 404);
      if (req.user.role === 'customer' && booking.user_id !== req.user.id)
        return error(res, 'Forbidden.', 403);
      const payments = await PaymentModel.findByBooking(req.params.bookingId);
      return success(res, { payments });
    } catch (err) { next(err); }
  },

  // ── POST /api/payments/:id/create-qris ────────────────────────
  async createQris(req, res, next) {
    try {
      const payment = await PaymentModel.findById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      if (req.user.role === 'customer' && payment.customer_email !== req.user.email)
        return error(res, 'Forbidden.', 403);
      if (payment.status === 'paid')
        return success(res, { status: 'paid', alreadyPaid: true });

      const booking = await BookingModel.findById(payment.booking_id);

      // ── Try Midtrans first ────────────────────────────────────
      if (isMidtransConfigured()) {
        try {
          const mt = getMidtrans();

          // Return cached QR if still fresh (< 14 min old)
          if (payment.qris_url && payment.qris_expiry) {
            const expiry = new Date(payment.qris_expiry);
            if (expiry > new Date(Date.now() + 60000)) {
              return success(res, {
                qrImageUrl: payment.qris_url,
                orderId:    payment.payment_code,
                expiryTime: payment.qris_expiry,
                source:     'midtrans',
              });
            }
          }

          const charge = await mt.createQrisCharge({
            orderId:       payment.payment_code,
            amount:        payment.amount,
            customerName:  payment.customer_name || req.user.fullName || 'Customer',
            customerEmail: payment.customer_email || req.user.email,
            itemName:      `WisataPass – ${booking?.attraction_name || 'Ticket'}`,
          });

          await PaymentModel.saveQrisData(payment.id, charge.qrImageUrl, charge.expiryTime);
          logger.info(`QRIS created via Midtrans: ${payment.payment_code}`);

          return success(res, {
            qrImageUrl: charge.qrImageUrl,
            qrString:   charge.qrString,
            orderId:    charge.orderId,
            expiryTime: charge.expiryTime,
            source:     'midtrans',
          });
        } catch (mtErr) {
          logger.warn(`Midtrans QRIS failed (${mtErr.message}), falling back to simulated QRIS`);
          // Fall through to simulation below
        }
      }

      // ── Fallback: generate a simulated QRIS QR ───────────────
      // Encodes a realistic QRIS string so it scans like a real QR
      const qrisString = generateSimulatedQrisString(payment.payment_code, payment.amount);
      const qrDataUrl  = await QRCode.toDataURL(qrisString, {
        errorCorrectionLevel: 'M',
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await PaymentModel.saveQrisData(payment.id, qrDataUrl, expiryTime);

      return success(res, {
        qrImageUrl: qrDataUrl,
        qrString:   qrisString,
        orderId:    payment.payment_code,
        expiryTime: expiryTime,
        source:     'simulated',
      });
    } catch (err) { next(err); }
  },

  // ── GET /api/payments/:id/status ──────────────────────────────
  async checkStatus(req, res, next) {
    try {
      const payment = await PaymentModel.findById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      if (req.user.role === 'customer' && payment.customer_email !== req.user.email)
        return error(res, 'Forbidden.', 403);

      if (payment.status === 'paid')
        return success(res, { status: 'paid', alreadyPaid: true });

      // Check Midtrans if configured
      if (isMidtransConfigured()) {
        try {
          const mt     = getMidtrans();
          const mtStatus = await mt.checkTransactionStatus(payment.payment_code);
          if (mt.isSettled(mtStatus.transactionStatus, mtStatus.fraudStatus)) {
            await _confirmPayment(payment, mtStatus.settlementTime);
            return success(res, { status: 'paid', justPaid: true });
          }
          const map = { expire:'failed', cancel:'failed', deny:'failed', settlement:'paid', capture:'paid' };
          return success(res, { status: map[mtStatus.transactionStatus] || payment.status, mtStatus: mtStatus.transactionStatus });
        } catch (_) { /* Midtrans unavailable – return DB status */ }
      }

      return success(res, { status: payment.status });
    } catch (err) { next(err); }
  },

  // ── POST /api/payments/:id/confirm-sim ───────────────────────
  // Used in sandbox/demo mode to simulate a successful payment
  async confirmSimulated(req, res, next) {
    try {
      const payment = await PaymentModel.findById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      // Only allow in non-production
      if (process.env.NODE_ENV === 'production' && process.env.MIDTRANS_IS_PRODUCTION === 'true')
        return error(res, 'Not available in production.', 403);
      if (payment.status === 'paid') return success(res, { status: 'paid', alreadyPaid: true });
      await _confirmPayment(payment, new Date().toISOString());
      return success(res, { status: 'paid', justPaid: true }, 'Payment confirmed (simulation).');
    } catch (err) { next(err); }
  },

  // ── POST /api/payments/webhook (Midtrans → server) ───────────
  async webhook(req, res, next) {
    try {
      const notification = req.body;
      logger.info(`Midtrans webhook: order=${notification.order_id} status=${notification.transaction_status}`);

      if (!midtrans) midtrans = require('../services/midtransService');
      if (!midtrans.verifyWebhookSignature(notification)) {
        logger.warn('Invalid Midtrans webhook signature');
        return res.status(400).json({ message: 'Invalid signature.' });
      }

      if (midtrans.isSettled(notification.transaction_status, notification.fraud_status)) {
        const payment = await PaymentModel.findByCode(notification.order_id);
        if (payment && payment.status !== 'paid') {
          await _confirmPayment(payment, notification.settlement_time);
        }
      }
      return res.json({ status: 'ok' });
    } catch (err) {
      logger.error('Webhook error: ' + err.message);
      return res.status(500).json({ message: 'Webhook error.' });
    }
  },

  // ── POST /api/payments/:id/upload-proof (manual fallback) ────
  async uploadProof(req, res, next) {
    try {
      const payment = await PaymentModel.findById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      if (req.user.role === 'customer') {
        const booking = await BookingModel.findById(payment.booking_id);
        if (booking.user_id !== req.user.id) return error(res, 'Forbidden.', 403);
      }
      if (!req.file) return error(res, 'No proof image provided.', 400);
      const updated = await PaymentModel.updateProof(payment.id, `/uploads/payments/${req.file.filename}`);
      return success(res, { payment: updated }, 'Proof uploaded. Waiting for admin confirmation.');
    } catch (err) { next(err); }
  },

  // ── PUT /api/payments/:id/confirm (admin manual) ─────────────
  async confirm(req, res, next) {
    try {
      const payment = await PaymentModel.findById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      if (payment.status === 'paid') return error(res, 'Already confirmed.', 400);
      await _confirmPayment(payment, new Date().toISOString());
      const updated = await PaymentModel.findById(payment.id);
      return success(res, { payment: updated }, 'Payment confirmed.');
    } catch (err) { next(err); }
  },

  // ── PUT /api/payments/:id/reject (admin) ─────────────────────
  async reject(req, res, next) {
    try {
      const payment = await PaymentModel.findById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      const updated = await PaymentModel.updateStatus(payment.id, 'failed');
      return success(res, { payment: updated }, 'Payment rejected.');
    } catch (err) { next(err); }
  },
};

// ── Shared confirm helper ─────────────────────────────────────
async function _confirmPayment(payment, paidAt) {
  await PaymentModel.updateStatus(payment.id, 'paid');
  const booking = await BookingModel.updateStatus(payment.booking_id, 'confirmed');
  await BookingModel.updatePaymentStatus(payment.booking_id, 'paid');
  socketService.onBookingConfirmed({ ...booking, attraction_name: booking.attraction_name });
  notificationService.paymentReceived(booking.user_id, booking).catch(() => {});
  notificationService.bookingConfirmed(booking.user_id, booking).catch(() => {});
  logger.info(`Payment confirmed: ${payment.payment_code}`);
}

// ── Simulated QRIS string (realistic QRIS EMVCo format stub) ──
function generateSimulatedQrisString(paymentCode, amount) {
  const amountStr = Math.round(amount).toString();
  // Minimal QRIS EMVCo-like string for display purposes
  return [
    '000201',                          // Payload format
    '010212',                          // Point of initiation
    '26570014ID.CO.WISATAPASS.WWW',    // Merchant account info
    `0119${paymentCode.substring(0,19)}`,
    `52044111`,                        // MCC
    '5303360',                         // Currency IDR
    `5406${amountStr.padStart(6,'0')}`,// Amount
    '5802ID',                          // Country
    '5920WisataPass Tickets',          // Merchant name
    '6013Jakarta Pusat',               // City
    '6304',                            // CRC placeholder
  ].join('');
}

module.exports = paymentController;
