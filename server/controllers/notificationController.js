const NotificationModel = require('../models/NotificationModel');
const { success, getPagination, paginate } = require('../utils/helpers');

const notificationController = {
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const unreadOnly = req.query.unread === 'true';
      const { rows, total } = await NotificationModel.findByUser(req.user.id, { limit, offset, unreadOnly });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  async markRead(req, res, next) {
    try {
      await NotificationModel.markRead(req.params.id, req.user.id);
      return success(res, {}, 'Notification marked as read.');
    } catch (err) { next(err); }
  },

  async markAllRead(req, res, next) {
    try {
      await NotificationModel.markAllRead(req.user.id);
      return success(res, {}, 'All notifications marked as read.');
    } catch (err) { next(err); }
  },

  async unreadCount(req, res, next) {
    try {
      const count = await NotificationModel.countUnread(req.user.id);
      return success(res, { count });
    } catch (err) { next(err); }
  },
};

module.exports = notificationController;
