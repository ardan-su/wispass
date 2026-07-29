const { query } = require('../config/database');

const TicketModel = {
  async create(client, { id, ticketCode, bookingId, bookingDetailId, userId, attractionId,
                          ticketTypeId, visitDate, validationToken, qrCode, qrData, expiresAt }) {
    const { rows } = await client.query(
      `INSERT INTO tickets
         (id,ticket_code,booking_id,booking_detail_id,user_id,attraction_id,
          ticket_type_id,visit_date,validation_token,qr_code,qr_data,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id,ticketCode,bookingId,bookingDetailId,userId,attractionId,
       ticketTypeId,visitDate,validationToken,qrCode,qrData,expiresAt]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT t.*,
              u.full_name AS customer_name, u.email AS customer_email,
              a.name AS attraction_name, a.location AS attraction_location,
              a.open_time, a.close_time,
              tt.name AS ticket_type_name,
              b.booking_code
       FROM tickets t
       JOIN users u ON u.id=t.user_id
       JOIN attractions a ON a.id=t.attraction_id
       JOIN ticket_types tt ON tt.id=t.ticket_type_id
       JOIN bookings b ON b.id=t.booking_id
       WHERE t.id=$1`,
      [id]
    );
    return rows[0]||null;
  },

  async findByCode(code) {
    const { rows } = await query(
      `SELECT t.*,
              u.full_name AS customer_name,
              a.name AS attraction_name,
              tt.name AS ticket_type_name,
              b.booking_code
       FROM tickets t
       JOIN users u ON u.id=t.user_id
       JOIN attractions a ON a.id=t.attraction_id
       JOIN ticket_types tt ON tt.id=t.ticket_type_id
       JOIN bookings b ON b.id=t.booking_id
       WHERE t.ticket_code=$1`,
      [code]
    );
    return rows[0]||null;
  },

  async findByToken(token) {
    const { rows } = await query(
      `SELECT t.*,
              u.full_name AS customer_name,
              a.name AS attraction_name,
              tt.name AS ticket_type_name,
              b.booking_code
       FROM tickets t
       JOIN users u ON u.id=t.user_id
       JOIN attractions a ON a.id=t.attraction_id
       JOIN ticket_types tt ON tt.id=t.ticket_type_id
       JOIN bookings b ON b.id=t.booking_id
       WHERE t.validation_token=$1`,
      [token]
    );
    return rows[0]||null;
  },

  async findByBooking(bookingId) {
    const { rows } = await query(
      `SELECT t.*, tt.name AS ticket_type_name
       FROM tickets t
       JOIN ticket_types tt ON tt.id=t.ticket_type_id
       WHERE t.booking_id=$1 ORDER BY t.created_at`,
      [bookingId]
    );
    return rows;
  },

  async findByUser(userId, { status, limit, offset } = {}) {
    let sql = `
      SELECT t.*, a.name AS attraction_name, a.cover_image, a.city,
             tt.name AS ticket_type_name, b.booking_code
      FROM tickets t
      JOIN attractions a ON a.id=t.attraction_id
      JOIN ticket_types tt ON tt.id=t.ticket_type_id
      JOIN bookings b ON b.id=t.booking_id
      WHERE t.user_id=$1`;
    const params = [userId];
    if (status) { params.push(status); sql+=` AND t.status=$${params.length}`; }
    const cParams = [userId];
    let cSql = `SELECT COUNT(*) AS total FROM tickets t WHERE t.user_id=$1`;
    if (status) { cParams.push(status); cSql += ` AND t.status=$${cParams.length}`; }
    const { rows: cr } = await query(cSql, cParams);
    params.push(limit||10, offset||0);
    sql += ` ORDER BY t.visit_date DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
    const { rows } = await query(sql, params);
    return { rows, total: parseInt(cr[0].total) };
  },

  async updateStatus(id, status) {
    const extra = status === 'used' ? `, used_at=NOW()` : '';
    const { rows } = await query(
      `UPDATE tickets SET status=$1${extra},updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, id]
    );
    return rows[0];
  },

  async cancelByBooking(client, bookingId) {
    await client.query(
      `UPDATE tickets SET status='cancelled',updated_at=NOW() WHERE booking_id=$1`,
      [bookingId]
    );
  },

  async logValidation({ id, ticketId, validatedBy, result, notes }) {
    await query(
      `INSERT INTO ticket_validations (id,ticket_id,validated_by,result,notes)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, ticketId, validatedBy, result, notes||null]
    );
  },

  async getValidationHistory(ticketId) {
    const { rows } = await query(
      `SELECT tv.*, u.full_name AS validator_name
       FROM ticket_validations tv JOIN users u ON u.id=tv.validated_by
       WHERE tv.ticket_id=$1 ORDER BY tv.created_at DESC`,
      [ticketId]
    );
    return rows;
  },

  async expireOld() {
    const { rows } = await query(
      `UPDATE tickets SET status='expired',updated_at=NOW()
       WHERE status='active' AND expires_at < NOW() RETURNING id`
    );
    return rows.length;
  },
};

module.exports = TicketModel;
