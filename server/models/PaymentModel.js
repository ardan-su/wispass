const { query } = require('../config/database');

const PaymentModel = {
  async findByBooking(bookingId) {
    const { rows } = await query(
      `SELECT * FROM payments WHERE booking_id=$1 ORDER BY created_at DESC`,
      [bookingId]
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT p.*,
              b.booking_code, b.total_amount AS booking_total,
              u.full_name AS customer_name, u.email AS customer_email
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN users   u ON u.id = b.user_id
       WHERE p.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByCode(paymentCode) {
    const { rows } = await query(
      `SELECT p.*,
              b.booking_code, b.total_amount AS booking_total,
              u.full_name AS customer_name, u.email AS customer_email
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN users   u ON u.id = b.user_id
       WHERE p.payment_code = $1`,
      [paymentCode]
    );
    return rows[0] || null;
  },

  async create(client, { id, bookingId, paymentCode, amount, method }) {
    const { rows } = await client.query(
      `INSERT INTO payments (id, booking_id, payment_code, amount, method)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, bookingId, paymentCode, amount, method || 'qris']
    );
    return rows[0];
  },

  async updateStatus(id, status) {
    const { rows } = await query(
      `UPDATE payments
       SET status   = $1,
           paid_at  = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END,
           updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return rows[0];
  },

  async updateProof(id, proofImage) {
    const { rows } = await query(
      `UPDATE payments SET proof_image = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [proofImage, id]
    );
    return rows[0];
  },

  /** Persist the Midtrans QRIS image URL and expiry for caching. */
  async saveQrisData(id, qrisUrl, qrisExpiry) {
    // Uses two extra columns that we add via migration below.
    // Falls back gracefully if columns don't exist yet.
    try {
      await query(
        `UPDATE payments SET qris_url = $1, qris_expiry = $2, updated_at = NOW() WHERE id = $3`,
        [qrisUrl, qrisExpiry, id]
      );
    } catch (_) { /* columns may not exist in older DB — non-fatal */ }
  },
};

module.exports = PaymentModel;
