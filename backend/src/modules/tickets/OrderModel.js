/**
 * Order Model (formerly Booking) – MariaDB edition
 * Table: ticket_orders (was: bookings), order_details (was: booking_details)
 */
const { query } = require('../../config/database');

const OrderModel = {
  async findAll({ limit, offset, search, status, userId, siteId, dateFrom, dateTo } = {}) {
    let sql  = `
      SELECT o.*,
             u.full_name AS customer_name, u.email AS customer_email,
             ts.name AS attraction_name, ts.cover_image AS attraction_image,
             ts.city AS attraction_city,
             p.status AS payment_status_val,
             (SELECT COUNT(*) FROM tickets t WHERE t.order_id = o.id) AS ticket_count
      FROM ticket_orders o
      JOIN users u         ON u.id  = o.user_id
      JOIN tourist_sites ts ON ts.id = o.site_id
      LEFT JOIN payments p  ON p.order_id = o.id
      WHERE o.deleted_at IS NULL`;
    let cSql = `SELECT COUNT(*) AS total
      FROM ticket_orders o
      JOIN users u          ON u.id  = o.user_id
      JOIN tourist_sites ts ON ts.id = o.site_id
      LEFT JOIN payments p  ON p.order_id = o.id
      WHERE o.deleted_at IS NULL`;
    const params  = [];
    const cParams = [];

    function addCond(clause, ...vals) {
      sql   += clause; params.push(...vals);
      cSql  += clause; cParams.push(...vals);
    }

    if (search) {
      const like = `%${search}%`;
      addCond(` AND (o.booking_code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)`, like, like, like);
    }
    if (status)  addCond(` AND o.status = ?`, status);
    if (userId)  addCond(` AND o.user_id = ?`, userId);
    if (siteId)  addCond(` AND o.site_id = ?`, siteId);
    if (dateFrom) addCond(` AND o.visit_date >= ?`, dateFrom);
    if (dateTo)   addCond(` AND o.visit_date <= ?`, dateTo);

    const cr    = await query(cSql, cParams);
    const total = parseInt(cr[0].total);

    params.push(limit || 10, offset || 0);
    sql += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    const rows = await query(sql, params);
    return { rows, total };
  },

  async findById(id) {
    const rows = await query(
      `SELECT o.*,
              u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
              ts.name AS attraction_name, ts.location AS attraction_location,
              ts.city AS attraction_city, ts.cover_image AS attraction_image,
              ts.open_time, ts.close_time,
              pr.code AS promo_code, pr.name AS promo_name
       FROM ticket_orders o
       JOIN users u          ON u.id  = o.user_id
       JOIN tourist_sites ts ON ts.id = o.site_id
       LEFT JOIN promotions pr ON pr.id = o.promotion_id
       WHERE o.id = ? AND o.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  async findByCode(code) {
    const rows = await query(`SELECT * FROM ticket_orders WHERE booking_code = ? AND deleted_at IS NULL`, [code]);
    return rows[0] || null;
  },

  async getDetails(orderId) {
    return query(
      `SELECT od.*, tt.name AS ticket_type_name
       FROM order_details od JOIN ticket_types tt ON tt.id = od.ticket_type_id
       WHERE od.order_id = ?`,
      [orderId]
    );
  },

  async create(conn, { id, bookingCode, userId, siteId, branchId, promotionId, visitDate,
                       subtotal, discountAmount, totalAmount, notes }) {
    const exe = conn
      ? (sql, p) => conn.execute(sql, p).then(([r]) => r)
      : (sql, p) => query(sql, p);

    await exe(
      `INSERT INTO ticket_orders
         (id,booking_code,user_id,site_id,branch_id,promotion_id,visit_date,
          subtotal,discount_amount,total_amount,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, bookingCode, userId, siteId, branchId || null, promotionId || null, visitDate,
       subtotal, discountAmount || 0, totalAmount, notes || null]
    );
    const rows = await exe(`SELECT * FROM ticket_orders WHERE id = ?`, [id]);
    return rows[0];
  },

  async addDetail(conn, { id, orderId, ticketTypeId, quantity, unitPrice, subtotal, visitorData }) {
    const exe = conn
      ? (sql, p) => conn.execute(sql, p).then(([r]) => r)
      : (sql, p) => query(sql, p);

    await exe(
      `INSERT INTO order_details
         (id,order_id,ticket_type_id,quantity,unit_price,subtotal,visitor_data)
       VALUES (?,?,?,?,?,?,?)`,
      [id, orderId, ticketTypeId, quantity, unitPrice, subtotal, JSON.stringify(visitorData || [])]
    );
    const rows = await exe(`SELECT * FROM order_details WHERE id = ?`, [id]);
    return rows[0];
  },

  async updateStatus(id, status, extra = {}) {
    const tsMap = { confirmed: 'confirmed_at', cancelled: 'cancelled_at', completed: 'completed_at' };
    const sets  = ['status = ?'];
    const params = [status];

    if (tsMap[status]) { sets.push(`${tsMap[status]} = NOW()`); }
    if (extra.adminNotes !== undefined) { sets.push('admin_notes = ?'); params.push(extra.adminNotes); }

    params.push(id);
    await query(`UPDATE ticket_orders SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  },

  async updatePaymentStatus(id, paymentStatus) {
    await query(`UPDATE ticket_orders SET payment_status = ? WHERE id = ?`, [paymentStatus, id]);
    return this.findById(id);
  },

  async countByStatus(userId = null) {
    let sql    = `SELECT status, COUNT(*) AS count FROM ticket_orders`;
    const params = [];
    if (userId) { sql += ` WHERE user_id = ?`; params.push(userId); }
    sql += ` GROUP BY status`;
    return query(sql, params);
  },
};

module.exports = OrderModel;
