const { query, getClient } = require('../config/database');

const BookingModel = {
  async findAll({ limit, offset, search, status, userId, attractionId, dateFrom, dateTo }) {
    let sql = `
      SELECT b.*, 
             u.full_name AS customer_name, u.email AS customer_email,
             a.name AS attraction_name, a.cover_image AS attraction_image,
             a.city AS attraction_city,
             p.status AS payment_status_val,
             (SELECT COUNT(*) FROM tickets t WHERE t.booking_id=b.id) AS ticket_count
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN attractions a ON a.id = b.attraction_id
      LEFT JOIN payments p ON p.booking_id = b.id
      WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (b.booking_code ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    if (status) { params.push(status); sql += ` AND b.status=$${params.length}`; }
    if (userId) { params.push(userId); sql += ` AND b.user_id=$${params.length}`; }
    if (attractionId) { params.push(attractionId); sql += ` AND b.attraction_id=$${params.length}`; }
    if (dateFrom) { params.push(dateFrom); sql += ` AND b.visit_date>=$${params.length}`; }
    if (dateTo)   { params.push(dateTo);   sql += ` AND b.visit_date<=$${params.length}`; }

    const countBase = `SELECT COUNT(*) AS total FROM bookings b
      JOIN users u ON u.id=b.user_id JOIN attractions a ON a.id=b.attraction_id
      LEFT JOIN payments p ON p.booking_id=b.id WHERE 1=1`;
    const condStart = sql.indexOf('WHERE 1=1') + 'WHERE 1=1'.length;
    const conditions = sql.substring(condStart).split('ORDER BY')[0];
    const { rows: cr } = await query(countBase + conditions, params);
    const total = parseInt(cr[0].total);

    params.push(limit, offset);
    sql += ` ORDER BY b.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
    const { rows } = await query(sql, params);
    return { rows, total };
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT b.*,
              u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
              a.name AS attraction_name, a.location AS attraction_location, a.city AS attraction_city,
              a.cover_image AS attraction_image, a.open_time, a.close_time,
              pr.code AS promo_code, pr.name AS promo_name
       FROM bookings b
       JOIN users u ON u.id=b.user_id
       JOIN attractions a ON a.id=b.attraction_id
       LEFT JOIN promotions pr ON pr.id=b.promotion_id
       WHERE b.id=$1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByCode(code) {
    const { rows } = await query(`SELECT * FROM bookings WHERE booking_code=$1`,[code]);
    return rows[0]||null;
  },

  async getDetails(bookingId) {
    const { rows } = await query(
      `SELECT bd.*, tt.name AS ticket_type_name
       FROM booking_details bd
       JOIN ticket_types tt ON tt.id=bd.ticket_type_id
       WHERE bd.booking_id=$1`,
      [bookingId]
    );
    return rows;
  },

  async create(client, { id, bookingCode, userId, attractionId, promotionId, visitDate,
                          subtotal, discountAmount, totalAmount, notes }) {
    const { rows } = await client.query(
      `INSERT INTO bookings
         (id,booking_code,user_id,attraction_id,promotion_id,visit_date,
          subtotal,discount_amount,total_amount,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id,bookingCode,userId,attractionId,promotionId||null,visitDate,
       subtotal,discountAmount||0,totalAmount,notes||null]
    );
    return rows[0];
  },

  async addDetail(client, { id, bookingId, ticketTypeId, quantity, unitPrice, subtotal, visitorData }) {
    const { rows } = await client.query(
      `INSERT INTO booking_details
         (id,booking_id,ticket_type_id,quantity,unit_price,subtotal,visitor_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id,bookingId,ticketTypeId,quantity,unitPrice,subtotal,JSON.stringify(visitorData||[])]
    );
    return rows[0];
  },

  async updateStatus(id, status, extra = {}) {
    const tsField = {
      confirmed: 'confirmed_at', cancelled: 'cancelled_at', completed: 'completed_at'
    }[status];
    const tsClause = tsField ? `, ${tsField}=NOW()` : '';
    const params = [status];
    let adminClause = '';
    if (extra.adminNotes !== undefined) {
      params.push(extra.adminNotes);
      adminClause = `, admin_notes=$${params.length}`;
    }
    params.push(id);
    const { rows } = await query(
      `UPDATE bookings SET status=$1${tsClause}${adminClause},updated_at=NOW()
       WHERE id=$${params.length} RETURNING *`,
      params
    );
    return rows[0];
  },

  async updatePaymentStatus(id, paymentStatus) {
    const { rows } = await query(
      `UPDATE bookings SET payment_status=$1,updated_at=NOW() WHERE id=$2 RETURNING *`,
      [paymentStatus, id]
    );
    return rows[0];
  },

  async countByStatus(userId = null) {
    let sql = `SELECT status, COUNT(*) AS count FROM bookings`;
    const params = [];
    if (userId) { params.push(userId); sql += ` WHERE user_id=$1`; }
    sql += ` GROUP BY status`;
    const { rows } = await query(sql, params);
    return rows;
  },
};

module.exports = BookingModel;
