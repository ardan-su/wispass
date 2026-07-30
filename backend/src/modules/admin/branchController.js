/**
 * Branch Controller – CRUD for tourist site branches (entry gates)
 */
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { success, error, getPagination, paginate, sanitize } = require('../../utils/helpers');

const branchController = {
  // GET /api/branches
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { siteId, search } = req.query;

      let where = 'WHERE b.deleted_at IS NULL';
      const params = [];
      const countParams = [];

      if (siteId) {
        where += ' AND b.site_id = ?';
        params.push(siteId); countParams.push(siteId);
      }
      if (search) {
        where += ' AND (b.name LIKE ? OR b.address LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
        countParams.push(`%${search}%`, `%${search}%`);
      }

      const countRows = await query(
        `SELECT COUNT(*) AS total FROM branches b ${where}`, countParams
      );
      const total = parseInt(countRows[0].total);

      const rows = await query(
        `SELECT b.*, ts.name AS site_name
         FROM branches b
         LEFT JOIN tourist_sites ts ON ts.id = b.site_id
         ${where}
         ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/branches/:id
  async detail(req, res, next) {
    try {
      const rows = await query(
        `SELECT b.*, ts.name AS site_name
         FROM branches b
         LEFT JOIN tourist_sites ts ON ts.id = b.site_id
         WHERE b.id = ? AND b.deleted_at IS NULL`,
        [req.params.id]
      );
      if (!rows.length) return error(res, 'Branch not found.', 404);
      return success(res, { branch: rows[0] });
    } catch (err) { next(err); }
  },

  // POST /api/branches
  async create(req, res, next) {
    try {
      const { tourist_site_id, name, location, is_active } = req.body;

      // Verify site exists
      const site = await query(
        `SELECT id FROM tourist_sites WHERE id = ? AND deleted_at IS NULL`, [tourist_site_id]
      );
      if (!site.length) return error(res, 'Tourist site not found.', 404);

      const id = uuid();
      const branchCode = `BR-${id.substring(0,8).toUpperCase()}`;
      await query(
        `INSERT INTO branches (id, site_id, name, code, address, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, tourist_site_id, sanitize(name), branchCode, sanitize(location || ''), is_active !== false ? 1 : 0]
      );

      await query(
        `INSERT INTO audit_logs (id, user_id, action, module, entity_id, ip_address, created_at)
         VALUES (?, ?, 'branch:create', 'branches', ?, ?, NOW(3))`,
        [uuid(), req.user.id, id, req.ip]
      );

      const rows = await query(
        `SELECT b.*, ts.name AS site_name FROM branches b
         LEFT JOIN tourist_sites ts ON ts.id = b.site_id WHERE b.id = ?`, [id]
      );
      return success(res, { branch: rows[0] }, 'Branch created.', 201);
    } catch (err) { next(err); }
  },

  // PUT /api/branches/:id
  async update(req, res, next) {
    try {
      const existing = await query(
        `SELECT id FROM branches WHERE id = ? AND deleted_at IS NULL`, [req.params.id]
      );
      if (!existing.length) return error(res, 'Branch not found.', 404);

      const allowed = ['name', 'address', 'is_active', 'site_id'];
      const textFields = ['name', 'address'];
      const sets = [];
      const params = [];

      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          sets.push(`${field} = ?`);
          let val = req.body[field];
          if (textFields.includes(field)) val = sanitize(String(val));
          params.push(val);
        }
      }

      if (!sets.length) return error(res, 'No fields to update.', 400);
      sets.push('updated_at = NOW(3)');
      params.push(req.params.id);

      await query(`UPDATE branches SET ${sets.join(', ')} WHERE id = ?`, params);
      await query(
        `INSERT INTO audit_logs (id, user_id, action, module, entity_id, ip_address, created_at)
         VALUES (?, ?, 'branch:update', 'branches', ?, ?, NOW(3))`,
        [uuid(), req.user.id, req.params.id, req.ip]
      );

      const rows = await query(
        `SELECT b.*, ts.name AS site_name FROM branches b
         LEFT JOIN tourist_sites ts ON ts.id = b.site_id WHERE b.id = ?`, [req.params.id]
      );
      return success(res, { branch: rows[0] }, 'Branch updated.');
    } catch (err) { next(err); }
  },

  // DELETE /api/branches/:id
  async remove(req, res, next) {
    try {
      const existing = await query(
        `SELECT id FROM branches WHERE id = ? AND deleted_at IS NULL`, [req.params.id]
      );
      if (!existing.length) return error(res, 'Branch not found.', 404);

      await query(`UPDATE branches SET deleted_at = NOW(3) WHERE id = ?`, [req.params.id]);
      await query(
        `INSERT INTO audit_logs (id, user_id, action, module, entity_id, ip_address, created_at)
         VALUES (?, ?, 'branch:delete', 'branches', ?, ?, NOW(3))`,
        [uuid(), req.user.id, req.params.id, req.ip]
      );
      return success(res, {}, 'Branch deleted.');
    } catch (err) { next(err); }
  },
};

module.exports = branchController;
