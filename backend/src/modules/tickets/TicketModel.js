/**
 * Ticket Model – MariaDB edition
 * Table: tickets (now references ticket_orders instead of bookings)
 */
const { query } = require('../../config/database');

const TicketModel = {
  async create(conn, { id, ticketCode, orderId, orderDetailId, userId, siteId,
                       ticketTypeId, visitDate, validationToken, qrCode, qrData, expiresAt }) {
    const exe = conn
      ? (sql, p) => conn.execute(sql, p).then(([r]) => r)
      : (sql, p) => query(sql, p);

    await exe(
      `INSERT INTO tickets
         (id,ticket_code,order_id,order_detail_id,user_id,site_id,
          ticket_type_id,visit_date,validation_token,qr_code,qr_data,expires_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, ticketCode, orderId, orderDetailId, userId, siteId,
       ticketTypeId, visitDate, validationToken, qrCode, qrData, expiresAt]
    );
    const rows = await exe(`SELECT * FROM tickets WHERE id = ?`, [id]);
    return rows[0];
  },

  async findById(id) {
    const rows = await query(
      `SELECT t.*,
              u.full_name AS customer_name, u.email AS customer_email,
              ts.name AS attraction_name, ts.location AS attraction_location,
              ts.open_time, ts.close_time,
              tt.name AS ticket_type_name,
              o.booking_code
       FROM tickets t
       JOIN users u  ON u.id = t.user_id
       JOIN tourist_sites ts ON ts.id = t.site_id
       JOIN ticket_types tt  ON tt.id = t.ticket_type_id
       JOIN ticket_orders o  ON o.id  = t.order_id
       WHERE t.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByCode(code) {
    const rows = await query(
      `SELECT t.*,
              u.full_name AS customer_name,
              ts.name AS attraction_name,
              tt.name AS ticket_type_name,
              o.booking_code
       FROM tickets t
       JOIN users u  ON u.id = t.user_id
       JOIN tourist_sites ts ON ts.id = t.site_id
       JOIN ticket_types tt  ON tt.id = t.ticket_type_id
       JOIN ticket_orders o  ON o.id  = t.order_id
       WHERE t.ticket_code = ?`,
      [code]
    );
    return rows[0] || null;
  },

  async findByToken(token) {
    const rows = await query(
      `SELECT t.*,
              u.full_name AS customer_name,
              ts.name AS attraction_name,
              tt.name AS ticket_type_name,
              o.booking_code
       FROM tickets t
       JOIN users u  ON u.id = t.user_id
       JOIN tourist_sites ts ON ts.id = t.site_id
       JOIN ticket_types tt  ON tt.id = t.ticket_type_id
       JOIN ticket_orders o  ON o.id  = t.order_id
       WHERE t.validation_token = ?`,
      [token]
    );
    return rows[0] || null;
  },

  async findByOrder(orderId) {
    return query(
      `SELECT t.*, tt.name AS ticket_type_name
       FROM tickets t JOIN ticket_types tt ON tt.id = t.ticket_type_id
       WHERE t.order_id = ? ORDER BY t.created_at`,
      [orderId]
    );
  },

  async findByUser(userId, { status, limit, offset } = {}) {
    let sql    = `
      SELECT t.*, ts.name AS attraction_name, ts.cover_image, ts.city,
             tt.name AS ticket_type_name, o.booking_code
      FROM tickets t
      JOIN tourist_sites ts ON ts.id = t.site_id
      JOIN ticket_types tt  ON tt.id = t.ticket_type_id
      JOIN ticket_orders o  ON o.id  = t.order_id
      WHERE t.user_id = ?`;
    let cSql   = `SELECT COUNT(*) AS total FROM tickets t WHERE t.user_id = ?`;
    const params  = [userId];
    const cParams = [userId];

    if (status) {
      sql   += ` AND t.status = ?`; params.push(status);
      cSql  += ` AND t.status = ?`; cParams.push(status);
    }

    const cr = await query(cSql, cParams);
    params.push(limit || 10, offset || 0);
    sql += ` ORDER BY t.visit_date DESC LIMIT ? OFFSET ?`;
    const rows = await query(sql, params);
    return { rows, total: parseInt(cr[0].total) };
  },

  async updateStatus(id, status) {
    const extra = status === 'used' ? `, used_at = NOW()` : '';
    await query(`UPDATE tickets SET status = ?${extra} WHERE id = ?`, [status, id]);
    return this.findById(id);
  },

  async cancelByOrder(conn, orderId) {
    const exe = conn
      ? (sql, p) => conn.execute(sql, p)
      : (sql, p) => query(sql, p);
    await exe(`UPDATE tickets SET status = 'cancelled' WHERE order_id = ?`, [orderId]);
  },

  async logValidation({ id, ticketId, validatedBy, result, notes }) {
    // Keep using old table name for backward compat; if migrated: change to qr_scan_logs
    await query(
      `INSERT INTO qr_scan_logs (id, qr_id, scanned_by, result, notes, scan_time)
       SELECT ?, qc.id, ?, ?, ?, NOW()
       FROM qr_codes qc WHERE qc.ticket_id = ? LIMIT 1`,
      [id, validatedBy, result, notes || null, ticketId]
    ).catch(() => null); // non-fatal if no QR linked
  },

  async getValidationHistory(ticketId) {
    return query(
      `SELECT qsl.*, u.full_name AS validator_name
       FROM qr_scan_logs qsl
       LEFT JOIN users u ON u.id = qsl.scanned_by
       JOIN qr_codes qc ON qc.id = qsl.qr_id
       WHERE qc.ticket_id = ?
       ORDER BY qsl.scan_time DESC`,
      [ticketId]
    );
  },

  async expireOld() {
    const result = await query(
      `UPDATE tickets SET status = 'expired'
       WHERE status = 'active' AND expires_at < NOW()`
    );
    return result.affectedRows || 0;
  },
};

module.exports = TicketModel;
