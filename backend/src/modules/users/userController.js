/**
 * User Management Controller – admin CRUD for staff/admin users
 */
const { v4: uuid } = require('uuid');
const UserModel = require('./UserModel');
const { query }  = require('../../config/database');
const { success, error, getPagination, paginate, sanitize } = require('../../utils/helpers');

const userController = {
  // GET /api/users
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, role } = req.query;
      const { rows, total } = await UserModel.list({ limit, offset, search, role });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/users/:id
  async detail(req, res, next) {
    try {
      const user = await UserModel.findById(req.params.id);
      if (!user) return error(res, 'User not found.', 404);
      return success(res, { user });
    } catch (err) { next(err); }
  },

  // PUT /api/users/:id
  async update(req, res, next) {
    try {
      const existing = await UserModel.findById(req.params.id);
      if (!existing) return error(res, 'User not found.', 404);

      const { fullName, phone, roleId } = req.body;
      const sets = [];
      const params = [];

      if (fullName !== undefined) { sets.push('full_name = ?'); params.push(sanitize(fullName)); }
      if (phone !== undefined)    { sets.push('phone = ?');     params.push(sanitize(phone)); }
      if (roleId !== undefined)   { sets.push('role_id = ?');   params.push(roleId); }

      if (sets.length === 0) return error(res, 'No fields to update.', 400);

      params.push(req.params.id);
      await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params);

      // Audit log
      await query(
        `INSERT INTO audit_logs (id, user_id, action, module, entity_id, ip_address, created_at)
         VALUES (?, ?, 'user:update', 'users', ?, ?, NOW(3))`,
        [uuid(), req.user.id, req.params.id, req.ip]
      );

      const user = await UserModel.findById(req.params.id);
      return success(res, { user }, 'User updated successfully.');
    } catch (err) { next(err); }
  },

  // PUT /api/users/:id/activate
  async activate(req, res, next) {
    try {
      const existing = await UserModel.findById(req.params.id);
      if (!existing) return error(res, 'User not found.', 404);

      await UserModel.setActive(req.params.id, true);
      await query(
        `INSERT INTO audit_logs (id, user_id, action, module, entity_id, ip_address, created_at)
         VALUES (?, ?, 'user:activate', 'users', ?, ?, NOW(3))`,
        [uuid(), req.user.id, req.params.id, req.ip]
      );
      return success(res, {}, 'User activated.');
    } catch (err) { next(err); }
  },

  // PUT /api/users/:id/deactivate
  async deactivate(req, res, next) {
    try {
      if (req.user.id === req.params.id) return error(res, 'You cannot deactivate your own account.', 400);

      const existing = await UserModel.findById(req.params.id);
      if (!existing) return error(res, 'User not found.', 404);

      await UserModel.setActive(req.params.id, false);
      await query(
        `INSERT INTO audit_logs (id, user_id, action, module, entity_id, ip_address, created_at)
         VALUES (?, ?, 'user:deactivate', 'users', ?, ?, NOW(3))`,
        [uuid(), req.user.id, req.params.id, req.ip]
      );
      return success(res, {}, 'User deactivated.');
    } catch (err) { next(err); }
  },
};

module.exports = userController;
