/**
 * Settings Controller – key/value app configuration
 */
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { success, error, sanitize } = require('../../utils/helpers');

const settingsController = {
  // GET /api/settings
  async listAll(req, res, next) {
    try {
      const rows = await query(`SELECT * FROM settings ORDER BY \`key\` ASC`);
      return success(res, { settings: rows });
    } catch (err) { next(err); }
  },

  // GET /api/settings/:key
  async getByKey(req, res, next) {
    try {
      const rows = await query(`SELECT * FROM settings WHERE \`key\` = ?`, [req.params.key]);
      if (!rows.length) return error(res, 'Setting not found.', 404);
      return success(res, { setting: rows[0] });
    } catch (err) { next(err); }
  },

  // PUT /api/settings/:key
  async updateByKey(req, res, next) {
    try {
      const { value, description } = req.body;
      const existing = await query(`SELECT id FROM settings WHERE \`key\` = ?`, [req.params.key]);

      if (existing.length) {
        const sets = ['value = ?', 'updated_by = ?', 'updated_at = NOW(3)'];
        const params = [sanitize(String(value)), req.user.id];
        if (description !== undefined) { sets.unshift('description = ?'); params.unshift(sanitize(description)); }
        params.push(req.params.key);
        await query(`UPDATE settings SET ${sets.join(', ')} WHERE \`key\` = ?`, params);
      } else {
        // Create if not exists
        await query(
          `INSERT INTO settings (id, \`key\`, value, description, updated_by, updated_at)
           VALUES (?, ?, ?, ?, ?, NOW(3))`,
          [uuid(), req.params.key, sanitize(String(value)), sanitize(description || ''), req.user.id]
        );
      }

      await query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, created_at)
         VALUES (?, ?, 'settings:update', 'settings', ?, ?, NOW(3))`,
        [uuid(), req.user.id, req.params.key, req.ip]
      );

      const rows = await query(`SELECT * FROM settings WHERE \`key\` = ?`, [req.params.key]);
      return success(res, { setting: rows[0] }, 'Setting updated.');
    } catch (err) { next(err); }
  },
};

module.exports = settingsController;
