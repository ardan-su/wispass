/**
 * Notification Controller
 */
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { success, error, getPagination, paginate, sanitize } = require('../../utils/helpers');

const notificationController = {
  // GET /api/notifications
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { is_read } = req.query;

      let where = 'WHERE n.user_id = ?';
      const params = [req.user.id];
      const countParams = [req.user.id];

      if (is_read !== undefined) {
        where += ' AND n.is_read = ?';
        params.push(is_read === '1' || is_read === 'true' ? 1 : 0);
        countParams.push(is_read === '1' || is_read === 'true' ? 1 : 0);
      }

      const countRows = await query(
        `SELECT COUNT(*) AS total FROM notifications n ${where}`, countParams
      );
      const total = parseInt(countRows[0].total);

      const rows = await query(
        `SELECT * FROM notifications n ${where} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // GET /api/notifications/unread-count
  async unreadCount(req, res, next) {
    try {
      const rows = await query(
        `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`,
        [req.user.id]
      );
      return success(res, { count: parseInt(rows[0].count) });
    } catch (err) { next(err); }
  },

  // PUT /api/notifications/:id/read
  async markRead(req, res, next) {
    try {
      const result = await query(
        `UPDATE notifications SET is_read = 1, read_at = NOW(3) WHERE id = ? AND user_id = ?`,
        [req.params.id, req.user.id]
      );
      if (result.affectedRows === 0) return error(res, 'Notification not found.', 404);
      return success(res, {}, 'Notification marked as read.');
    } catch (err) { next(err); }
  },

  // PUT /api/notifications/read-all
  async markAllRead(req, res, next) {
    try {
      await query(
        `UPDATE notifications SET is_read = 1, read_at = NOW(3) WHERE user_id = ? AND is_read = 0`,
        [req.user.id]
      );
      return success(res, {}, 'All notifications marked as read.');
    } catch (err) { next(err); }
  },

  // POST /api/notifications  (admin only)
  async create(req, res, next) {
    try {
      const { user_id, type, title, message, data } = req.body;

      // Verify target user exists
      const userRows = await query(`SELECT id FROM users WHERE id = ? AND deleted_at IS NULL`, [user_id]);
      if (!userRows.length) return error(res, 'Target user not found.', 404);

      const id = uuid();
      await query(
        `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, NOW(3))`,
        [id, user_id, sanitize(type || 'info'), sanitize(title), sanitize(message), data ? JSON.stringify(data) : null]
      );

      // Emit socket event if service is available
      try {
        const socketSvc = require('../../sockets/socketService');
        if (socketSvc && socketSvc.emitToUser) {
          socketSvc.emitToUser(user_id, 'notification:new', { id, type, title, message, created_at: new Date() });
        }
      } catch (_) { /* socket not critical */ }

      const rows = await query(`SELECT * FROM notifications WHERE id = ?`, [id]);
      return success(res, { notification: rows[0] }, 'Notification sent.', 201);
    } catch (err) { next(err); }
  },
};

module.exports = notificationController;
