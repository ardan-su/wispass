const { query } = require('../config/database');

const NotificationModel = {
  async create({ id, userId, type, title, message, data }) {
    const { rows } = await query(
      `INSERT INTO notifications (id,user_id,type,title,message,data)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, userId, type, title, message, JSON.stringify(data||{})]
    );
    return rows[0];
  },

  async findByUser(userId, { limit=20, offset=0, unreadOnly=false } = {}) {
    let sql = `SELECT * FROM notifications WHERE user_id=$1`;
    const params = [userId];
    if (unreadOnly) sql += ` AND is_read=FALSE`;
    const { rows: cr } = await query(
      `SELECT COUNT(*) AS total FROM notifications WHERE user_id=$1${unreadOnly?' AND is_read=FALSE':''}`,
      [userId]
    );
    params.push(limit, offset);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
    const { rows } = await query(sql, params);
    return { rows, total: parseInt(cr[0].total) };
  },

  async markRead(id, userId) {
    await query(
      `UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2`, [id,userId]
    );
  },

  async markAllRead(userId) {
    await query(`UPDATE notifications SET is_read=TRUE WHERE user_id=$1`,[userId]);
  },

  async countUnread(userId) {
    const { rows } = await query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id=$1 AND is_read=FALSE`,[userId]
    );
    return parseInt(rows[0].count);
  },
};

module.exports = NotificationModel;
