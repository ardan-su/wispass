/**
 * Review Controller
 */
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { success, error, getPagination, paginate, sanitize } = require('../../utils/helpers');

const reviewController = {
  // GET /api/reviews/:siteId
  async listBySite(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { siteId } = req.params;

      const countRows = await query(
        `SELECT COUNT(*) AS total FROM reviews WHERE site_id = ? AND is_visible = 1`,
        [siteId]
      );
      const total = parseInt(countRows[0].total);

      const rows = await query(
        `SELECT r.id, r.rating, r.title, r.comment, r.created_at,
                u.full_name AS user_name, u.avatar AS user_avatar
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.site_id = ? AND r.is_visible = 1
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        [siteId, limit, offset]
      );

      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  // POST /api/reviews
  async create(req, res, next) {
    try {
      const { site_id, order_id, rating, title, comment } = req.body;

      // Check for duplicate review
      const existing = await query(
        `SELECT id FROM reviews WHERE site_id = ? AND user_id = ? AND is_visible = 1`,
        [site_id, req.user.id]
      );
      if (existing.length) return error(res, 'You have already reviewed this attraction.', 409);

      const id = uuid();
      await query(
        `INSERT INTO reviews (id, site_id, user_id, order_id, rating, title, comment, is_visible)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, site_id, req.user.id, order_id || null, rating, sanitize(title || ''), sanitize(comment)]
      );

      // Update site aggregate stats
      await query(
        `UPDATE tourist_sites SET
           total_reviews   = (SELECT COUNT(*) FROM reviews WHERE site_id = ? AND is_visible = 1),
           average_rating  = (SELECT ROUND(AVG(rating),2) FROM reviews WHERE site_id = ? AND is_visible = 1)
         WHERE id = ?`,
        [site_id, site_id, site_id]
      );

      const rows = await query(
        `SELECT r.*, u.full_name AS user_name FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.id = ?`, [id]
      );
      return success(res, { review: rows[0] }, 'Review submitted.', 201);
    } catch (err) { next(err); }
  },

  // DELETE /api/reviews/:id
  async remove(req, res, next) {
    try {
      const rows = await query(`SELECT * FROM reviews WHERE id = ?`, [req.params.id]);
      if (!rows.length) return error(res, 'Review not found.', 404);

      const review = rows[0];
      const isAdmin = ['admin', 'owner', 'super_admin'].includes(req.user.role);
      if (!isAdmin && review.user_id !== req.user.id) {
        return error(res, 'Not authorized to delete this review.', 403);
      }

      await query(`UPDATE reviews SET is_visible = 0 WHERE id = ?`, [req.params.id]);

      // Re-calculate site stats
      await query(
        `UPDATE tourist_sites SET
           total_reviews  = (SELECT COUNT(*) FROM reviews WHERE site_id = ? AND is_visible = 1),
           average_rating = (SELECT ROUND(AVG(rating),2) FROM reviews WHERE site_id = ? AND is_visible = 1)
         WHERE id = ?`,
        [review.site_id, review.site_id, review.site_id]
      );

      return success(res, {}, 'Review removed.');
    } catch (err) { next(err); }
  },
};

module.exports = reviewController;
