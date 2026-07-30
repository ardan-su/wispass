/**
 * Customer Controller – admin management of customer accounts
 */
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { success, error, getPagination, paginate, sanitize } = require('../../utils/helpers');

const customerController = {
  // GET /api/customers
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, is_active } = req.query;

      let where = `WHERE r.name = 'customer' AND u.deleted_at IS NULL`;
      const params = [];
      const countParams = [];

      if (search) {
        where += ' AND (u.email LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (is_active !== undefined) {
        where += ' AND u.is_active = ?';
        params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
        countParams.push(is_active === 'true' || is_active === '1' ? 1 : 0);
      }

      const countRows = await query(
        `SELECT COUNT(*) AS total FROM users u JOIN roles r ON r.id = u.role_id ${where}`,
        countParams
      );
      const total = parseInt(countRows[0].total);

      const rows = await query(
        `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.avatar,
                u.is_active, u.last_login_at, u.created_at,
                c.date_of_birth, c.gender, c.city, c.province
         FROM users u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN customers c ON c.user_id = u.id
         ${where}
         ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/customers/:id
  async detail(req, res, next) {
    try {
      const rows = await query(
        `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.avatar,
                u.is_active, u.last_login_at, u.created_at,
                c.date_of_birth, c.gender, c.address, c.city, c.province,
                c.postal_code, c.id_number
         FROM users u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN customers c ON c.user_id = u.id
         WHERE u.id = ? AND r.name = 'customer' AND u.deleted_at IS NULL`,
        [req.params.id]
      );
      if (!rows.length) return error(res, 'Customer not found.', 404);

      // Booking summary
      const summary = await query(
        `SELECT
           COUNT(*) AS total_bookings,
           COALESCE(SUM(CASE WHEN to2.status = 'completed' THEN p.amount ELSE 0 END), 0) AS total_spent,
           MAX(to2.created_at) AS last_booking_date
         FROM ticket_orders to2
         LEFT JOIN payments p ON p.order_id = to2.id AND p.status = 'paid'
         WHERE to2.user_id = ?`,
        [req.params.id]
      );

      return success(res, { customer: rows[0], summary: summary[0] });
    } catch (err) { next(err); }
  },

  // PUT /api/customers/:id
  async update(req, res, next) {
    try {
      const existing = await query(
        `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? AND r.name = 'customer' AND u.deleted_at IS NULL`,
        [req.params.id]
      );
      if (!existing.length) return error(res, 'Customer not found.', 404);

      const { fullName, phone } = req.body;
      const sets = [];
      const params = [];

      if (fullName !== undefined) { sets.push('full_name = ?'); params.push(sanitize(fullName)); }
      if (phone !== undefined)    { sets.push('phone = ?');     params.push(sanitize(phone)); }

      if (sets.length) {
        params.push(req.params.id);
        await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
      }

      await query(
        `INSERT INTO audit_logs (id, user_id, action, module, entity_id, ip_address, created_at)
         VALUES (?, ?, 'customer:update', 'users', ?, ?, NOW(3))`,
        [uuid(), req.user.id, req.params.id, req.ip]
      );

      const updated = await query(
        `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.is_active
         FROM users u WHERE u.id = ?`, [req.params.id]
      );
      return success(res, { customer: updated[0] }, 'Customer updated.');
    } catch (err) { next(err); }
  },

  // PUT /api/customers/:id/activate
  async activate(req, res, next) {
    try {
      const result = await query(
        `UPDATE users u JOIN roles r ON r.id = u.role_id
         SET u.is_active = 1
         WHERE u.id = ? AND r.name = 'customer' AND u.deleted_at IS NULL`,
        [req.params.id]
      );
      if (result.affectedRows === 0) return error(res, 'Customer not found.', 404);
      await query(
        `INSERT INTO audit_logs (id, user_id, action, module, entity_id, ip_address, created_at)
         VALUES (?, ?, 'customer:activate', 'users', ?, ?, NOW(3))`,
        [uuid(), req.user.id, req.params.id, req.ip]
      );
      return success(res, {}, 'Customer activated.');
    } catch (err) { next(err); }
  },

  // PUT /api/customers/:id/deactivate
  async deactivate(req, res, next) {
    try {
      const result = await query(
        `UPDATE users u JOIN roles r ON r.id = u.role_id
         SET u.is_active = 0
         WHERE u.id = ? AND r.name = 'customer' AND u.deleted_at IS NULL`,
        [req.params.id]
      );
      if (result.affectedRows === 0) return error(res, 'Customer not found.', 404);
      await query(
        `INSERT INTO audit_logs (id, user_id, action, module, entity_id, ip_address, created_at)
         VALUES (?, ?, 'customer:deactivate', 'users', ?, ?, NOW(3))`,
        [uuid(), req.user.id, req.params.id, req.ip]
      );
      return success(res, {}, 'Customer deactivated.');
    } catch (err) { next(err); }
  },
};

module.exports = customerController;
