/**
 * Promotion Controller – CRUD + promo code validation
 */
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { success, error, getPagination, paginate, sanitize } = require('../../utils/helpers');

const promotionController = {
  // GET /api/promotions
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { search, is_active } = req.query;

      let where = 'WHERE p.deleted_at IS NULL';
      const params = [];
      const countParams = [];

      if (search) {
        where += ' AND (p.code LIKE ? OR p.name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
        countParams.push(`%${search}%`, `%${search}%`);
      }
      if (is_active !== undefined) {
        where += ' AND p.is_active = ?';
        params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
        countParams.push(is_active === 'true' || is_active === '1' ? 1 : 0);
      }

      const countRows = await query(`SELECT COUNT(*) AS total FROM promotions p ${where}`, countParams);
      const total = parseInt(countRows[0].total);

      const rows = await query(
        `SELECT * FROM promotions p ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/promotions/:id
  async detail(req, res, next) {
    try {
      const rows = await query(
        `SELECT * FROM promotions WHERE id = ? AND deleted_at IS NULL`, [req.params.id]
      );
      if (!rows.length) return error(res, 'Promotion not found.', 404);
      return success(res, { promotion: rows[0] });
    } catch (err) { next(err); }
  },

  // POST /api/promotions
  async create(req, res, next) {
    try {
      const {
        code, name, description, discount_type, discount_value,
        min_purchase, max_discount, usage_limit, valid_from, valid_until,
      } = req.body;

      const id = uuid();
      await query(
        `INSERT INTO promotions (id, code, name, description, discount_type, discount_value,
          min_purchase, max_discount, usage_limit, valid_from, valid_until, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          id,
          sanitize(code).toUpperCase(),
          sanitize(name),
          sanitize(description || ''),
          discount_type,
          discount_value,
          min_purchase || 0,
          max_discount || null,
          usage_limit || null,
          valid_from,
          valid_until,
        ]
      );

      await query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, created_at)
         VALUES (?, ?, 'promotion:create', 'promotions', ?, ?, NOW(3))`,
        [uuid(), req.user.id, id, req.ip]
      );

      const rows = await query(`SELECT * FROM promotions WHERE id = ?`, [id]);
      return success(res, { promotion: rows[0] }, 'Promotion created.', 201);
    } catch (err) { next(err); }
  },

  // PUT /api/promotions/:id
  async update(req, res, next) {
    try {
      const existing = await query(
        `SELECT id FROM promotions WHERE id = ? AND deleted_at IS NULL`, [req.params.id]
      );
      if (!existing.length) return error(res, 'Promotion not found.', 404);

      const allowed = [
        'code', 'name', 'description', 'discount_type', 'discount_value',
        'min_purchase', 'max_discount', 'usage_limit', 'valid_from', 'valid_until', 'is_active',
      ];
      const textFields = ['code', 'name', 'description'];
      const sets = [];
      const params = [];

      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          sets.push(`${field} = ?`);
          let val = req.body[field];
          if (textFields.includes(field)) val = sanitize(String(val));
          if (field === 'code') val = val.toUpperCase();
          params.push(val);
        }
      }

      if (!sets.length) return error(res, 'No fields to update.', 400);
      params.push(req.params.id);

      await query(`UPDATE promotions SET ${sets.join(', ')} WHERE id = ?`, params);
      await query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, created_at)
         VALUES (?, ?, 'promotion:update', 'promotions', ?, ?, NOW(3))`,
        [uuid(), req.user.id, req.params.id, req.ip]
      );

      const rows = await query(`SELECT * FROM promotions WHERE id = ?`, [req.params.id]);
      return success(res, { promotion: rows[0] }, 'Promotion updated.');
    } catch (err) { next(err); }
  },

  // DELETE /api/promotions/:id
  async remove(req, res, next) {
    try {
      const existing = await query(
        `SELECT id FROM promotions WHERE id = ? AND deleted_at IS NULL`, [req.params.id]
      );
      if (!existing.length) return error(res, 'Promotion not found.', 404);

      await query(`UPDATE promotions SET deleted_at = NOW(3) WHERE id = ?`, [req.params.id]);
      await query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, created_at)
         VALUES (?, ?, 'promotion:delete', 'promotions', ?, ?, NOW(3))`,
        [uuid(), req.user.id, req.params.id, req.ip]
      );
      return success(res, {}, 'Promotion deleted.');
    } catch (err) { next(err); }
  },

  // POST /api/promotions/validate-code  (public)
  async validateCode(req, res, next) {
    try {
      const { code, amount = 0 } = req.body;
      if (!code) return error(res, 'Promo code is required.', 400);

      const rows = await query(
        `SELECT * FROM promotions
         WHERE code = ? AND is_active = 1
           AND valid_from <= NOW() AND valid_until >= NOW()
           AND deleted_at IS NULL`,
        [code.toUpperCase()]
      );
      if (!rows.length) return error(res, 'Invalid or expired promo code.', 404);

      const promo = rows[0];
      if (promo.usage_limit !== null && promo.used_count >= promo.usage_limit) {
        return error(res, 'Promo code usage limit has been reached.', 400);
      }
      if (parseFloat(amount) < parseFloat(promo.min_purchase || 0)) {
        return error(res, `Minimum purchase of ${promo.min_purchase} required for this code.`, 400);
      }

      let discountAmount = 0;
      if (promo.discount_type === 'percentage') {
        discountAmount = (parseFloat(promo.discount_value) / 100) * parseFloat(amount);
        if (promo.max_discount) discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount));
      } else {
        discountAmount = parseFloat(promo.discount_value);
      }

      return success(res, { promotion: promo, discountAmount: Math.round(discountAmount) });
    } catch (err) { next(err); }
  },
};

module.exports = promotionController;
