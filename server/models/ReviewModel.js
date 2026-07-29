const { query } = require('../config/database');

const ReviewModel = {
  async findByAttraction(attractionId, { limit=10, offset=0 } = {}) {
    const { rows: cr } = await query(
      `SELECT COUNT(*) AS total FROM reviews WHERE attraction_id=$1 AND is_visible=TRUE`,
      [attractionId]
    );
    const { rows } = await query(
      `SELECT r.*, u.full_name AS customer_name, u.avatar AS customer_avatar
       FROM reviews r JOIN users u ON u.id=r.user_id
       WHERE r.attraction_id=$1 AND r.is_visible=TRUE
       ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      [attractionId, limit, offset]
    );
    return { rows, total: parseInt(cr[0].total) };
  },

  async create({ id, attractionId, userId, bookingId, rating, title, comment }) {
    const { rows } = await query(
      `INSERT INTO reviews (id,attraction_id,user_id,booking_id,rating,title,comment)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id,attractionId,userId,bookingId||null,rating,title||null,comment||null]
    );
    return rows[0];
  },

  async delete(id) { await query(`DELETE FROM reviews WHERE id=$1`,[id]); },

  async setVisible(id, visible) {
    await query(`UPDATE reviews SET is_visible=$1 WHERE id=$2`,[visible,id]);
  },
};

module.exports = ReviewModel;
