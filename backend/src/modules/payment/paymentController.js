/**
 * Payment Controller – MariaDB edition
 * Ported from paymentController.js
 */
const { v4: uuid }    = require('uuid');
const QRCode          = require('qrcode');
const { query }       = require('../../config/database');
const socketSvc       = require('../../sockets/socketService');
const logger          = require('../../utils/logger');
const { success, error } = require('../../utils/helpers');

// ── Lazy Midtrans ──────────────────────────────────────────────────────────────
let midtrans = null;
function getMidtrans() {
  if (!midtrans) midtrans = require('../../services/midtransService');
  return midtrans;
}
const isMidtransConfigured = () =>
  process.env.MIDTRANS_SERVER_KEY && !process.env.MIDTRANS_SERVER_KEY.includes('xxxxxxx');

// ── Helpers ────────────────────────────────────────────────────────────────────
async function findPaymentById(id) {
  const rows = await query(
    `SELECT p.*, o.user_id, o.booking_code, o.site_id,
            u.full_name AS customer_name, u.email AS customer_email,
            ts.name AS attraction_name
     FROM payments p
     JOIN ticket_orders o ON o.id = p.order_id
     JOIN users u          ON u.id = o.user_id
     JOIN tourist_sites ts ON ts.id = o.site_id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
}
async function findPaymentByCode(code) {
  const rows = await query(`SELECT * FROM payments WHERE payment_code = ?`, [code]);
  return rows[0] || null;
}

async function _confirmPayment(payment, paidAt) {
  await query(`UPDATE payments SET status='paid', paid_at=? WHERE id=?`, [paidAt || new Date(), payment.id]);
  await query(`UPDATE ticket_orders SET status='confirmed', payment_status='paid', confirmed_at=NOW() WHERE id=?`, [payment.order_id]);

  // Log payment event
  await query(
    `INSERT INTO payment_logs (id, payment_id, event, payload) VALUES (?,?,'payment.confirmed',?)`,
    [uuid(), payment.id, JSON.stringify({ paidAt })]
  ).catch(() => {});

  socketSvc.onPaymentSuccess({ ...payment, user_id: payment.user_id });
  socketSvc.onBookingConfirmed({ id: payment.order_id, user_id: payment.user_id, attraction_name: payment.attraction_name });
  logger.info(`Payment confirmed: ${payment.payment_code}`);
}

const paymentController = {
  // GET /api/payments/booking/:orderId
  async byBooking(req, res, next) {
    try {
      const rows = await query(
        `SELECT p.*, o.user_id FROM payments p JOIN ticket_orders o ON o.id = p.order_id WHERE p.order_id = ?`,
        [req.params.bookingId || req.params.orderId]
      );
      if (!rows.length) return error(res, 'Payment not found.', 404);
      if (req.user.role === 'customer' && rows[0].user_id !== req.user.id)
        return error(res, 'Forbidden.', 403);
      return success(res, { payments: rows });
    } catch (err) { next(err); }
  },

  // POST /api/payments/:id/create-qris
  async createQris(req, res, next) {
    try {
      const payment = await findPaymentById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      if (req.user.role === 'customer' && payment.user_id !== req.user.id) return error(res, 'Forbidden.', 403);
      if (payment.status === 'paid') return success(res, { status: 'paid', alreadyPaid: true });

      if (isMidtransConfigured()) {
        try {
          const mt = getMidtrans();
          const charge = await mt.createQrisCharge({
            orderId:       payment.payment_code,
            amount:        payment.amount,
            customerName:  payment.customer_name,
            customerEmail: payment.customer_email,
            itemName:      `WisataPass – ${payment.attraction_name || 'Ticket'}`,
          });
          await query(`UPDATE payments SET proof_image=? WHERE id=?`, [charge.qrImageUrl, payment.id]);
          return success(res, { qrImageUrl: charge.qrImageUrl, qrString: charge.qrString, orderId: charge.orderId, expiryTime: charge.expiryTime, source: 'midtrans' });
        } catch (e) { logger.warn(`Midtrans QRIS failed: ${e.message}`); }
      }

      // Fallback simulated QRIS
      const qrisStr  = generateSimulatedQrisString(payment.payment_code, payment.amount);
      const qrDataUrl = await QRCode.toDataURL(qrisStr, { errorCorrectionLevel: 'M', width: 400, margin: 2 });
      const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await query(`UPDATE payments SET proof_image=? WHERE id=?`, [qrDataUrl, payment.id]);

      return success(res, { qrImageUrl: qrDataUrl, qrString: qrisStr, orderId: payment.payment_code, expiryTime, source: 'simulated' });
    } catch (err) { next(err); }
  },

  // GET /api/payments/:id/status
  async checkStatus(req, res, next) {
    try {
      const payment = await findPaymentById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      if (req.user.role === 'customer' && payment.user_id !== req.user.id) return error(res, 'Forbidden.', 403);
      if (payment.status === 'paid') return success(res, { status: 'paid', alreadyPaid: true });

      if (isMidtransConfigured()) {
        try {
          const mt     = getMidtrans();
          const mtStat = await mt.checkTransactionStatus(payment.payment_code);
          if (mt.isSettled(mtStat.transactionStatus, mtStat.fraudStatus)) {
            await _confirmPayment(payment, mtStat.settlementTime);
            return success(res, { status: 'paid', justPaid: true });
          }
          const map = { expire:'failed', cancel:'failed', deny:'failed', settlement:'paid', capture:'paid' };
          return success(res, { status: map[mtStat.transactionStatus] || payment.status });
        } catch (_) {}
      }
      return success(res, { status: payment.status });
    } catch (err) { next(err); }
  },

  // POST /api/payments/:id/confirm-sim
  async confirmSimulated(req, res, next) {
    try {
      const payment = await findPaymentById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      if (process.env.NODE_ENV === 'production' && process.env.MIDTRANS_IS_PRODUCTION === 'true')
        return error(res, 'Not available in production.', 403);
      if (payment.status === 'paid') return success(res, { status: 'paid', alreadyPaid: true });
      await _confirmPayment(payment, new Date().toISOString());
      return success(res, { status: 'paid', justPaid: true }, 'Payment confirmed (simulation).');
    } catch (err) { next(err); }
  },

  // POST /api/payments/webhook
  async webhook(req, res, next) {
    try {
      const n = req.body;
      logger.info(`Midtrans webhook: order=${n.order_id} status=${n.transaction_status}`);
      if (!midtrans) midtrans = require('../../services/midtransService');
      if (!midtrans.verifyWebhookSignature(n)) {
        logger.warn('Invalid Midtrans webhook signature');
        return res.status(400).json({ message: 'Invalid signature.' });
      }
      if (midtrans.isSettled(n.transaction_status, n.fraud_status)) {
        const payment = await findPaymentByCode(n.order_id);
        if (payment && payment.status !== 'paid') await _confirmPayment(payment, n.settlement_time);
      }
      return res.json({ status: 'ok' });
    } catch (err) { logger.error('Webhook error: ' + err.message); return res.status(500).json({ message: 'Webhook error.' }); }
  },

  // PUT /api/payments/:id/confirm (admin)
  async confirm(req, res, next) {
    try {
      const payment = await findPaymentById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      if (payment.status === 'paid') return error(res, 'Already confirmed.', 400);
      await _confirmPayment(payment, new Date().toISOString());
      const updated = await findPaymentById(payment.id);
      return success(res, { payment: updated }, 'Payment confirmed.');
    } catch (err) { next(err); }
  },

  // PUT /api/payments/:id/reject (admin)
  async reject(req, res, next) {
    try {
      const payment = await findPaymentById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      await query(`UPDATE payments SET status='failed' WHERE id=?`, [payment.id]);
      return success(res, {}, 'Payment rejected.');
    } catch (err) { next(err); }
  },

  // POST /api/payments/:id/upload-proof
  async uploadProof(req, res, next) {
    try {
      const payment = await findPaymentById(req.params.id);
      if (!payment) return error(res, 'Payment not found.', 404);
      if (req.user.role === 'customer' && payment.user_id !== req.user.id) return error(res, 'Forbidden.', 403);
      if (!req.file) return error(res, 'No proof image provided.', 400);
      await query(`UPDATE payments SET proof_image=? WHERE id=?`, [`/uploads/payments/${req.file.filename}`, payment.id]);
      return success(res, {}, 'Proof uploaded. Waiting for admin confirmation.');
    } catch (err) { next(err); }
  },
};

function generateSimulatedQrisString(paymentCode, amount) {
  const amountStr = Math.round(amount).toString();
  return ['000201','010212','26570014ID.CO.WISATAPASS.WWW',`0119${paymentCode.substring(0,19)}`,
    '52044111','5303360',`5406${amountStr.padStart(6,'0')}`,'5802ID','5920WisataPass Tickets','6013Jakarta Pusat','6304'].join('');
}

module.exports = paymentController;
