const UserModel = require('../models/UserModel');
const { query } = require('../config/database');
const { success, error, getPagination, paginate } = require('../utils/helpers');

const customerController = {
  // GET /api/customers  (admin)
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search } = req.query;
      const { rows, total } = await UserModel.list({ limit, offset, search, role: 'customer' });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/customers/:id  (admin)
  async detail(req, res, next) {
    try {
      const user = await UserModel.findWithCustomer(req.params.id);
      if (!user || user.role !== 'customer') return error(res, 'Customer not found.', 404);

      const { rows: bookingSummary } = await query(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS total
         FROM bookings WHERE user_id=$1 GROUP BY status`, [req.params.id]
      );
      return success(res, { user, bookingSummary });
    } catch (err) { next(err); }
  },

  // PUT /api/customers/:id  (admin)
  async update(req, res, next) {
    try {
      const { fullName, phone, isActive } = req.body;
      if (isActive !== undefined) await UserModel.setActive(req.params.id, isActive);
      const user = await UserModel.updateProfile(req.params.id, { fullName, phone });
      return success(res, { user }, 'Customer updated.');
    } catch (err) { next(err); }
  },

  // PUT /api/customers/:id/deactivate  (admin)
  async deactivate(req, res, next) {
    try {
      await UserModel.setActive(req.params.id, false);
      return success(res, {}, 'Customer deactivated.');
    } catch (err) { next(err); }
  },

  // PUT /api/customers/:id/activate  (admin)
  async activate(req, res, next) {
    try {
      await UserModel.setActive(req.params.id, true);
      return success(res, {}, 'Customer activated.');
    } catch (err) { next(err); }
  },
};

module.exports = customerController;
