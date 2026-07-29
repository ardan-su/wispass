const { v4: uuidv4 } = require('uuid');
const ReviewModel    = require('../models/ReviewModel');
const AttractionModel = require('../models/AttractionModel');
const { query }      = require('../config/database');
const { success, error, getPagination, paginate } = require('../utils/helpers');

const reviewController = {
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { rows, total } = await ReviewModel.findByAttraction(req.params.attractionId, { limit, offset });
      return res.json(paginate(rows, total, page, limit));
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { attractionId } = req.params;
      const { bookingId, rating, title, comment } = req.body;

      // Ensure customer has a completed booking for this attraction
      if (bookingId) {
        const { rows } = await query(
          `SELECT id FROM bookings WHERE id=$1 AND user_id=$2 AND attraction_id=$3 AND status='completed'`,
          [bookingId, req.user.id, attractionId]
        );
        if (!rows.length) return error(res, 'You must have a completed visit to leave a review.', 403);
      }

      const review = await ReviewModel.create({
        id: uuidv4(), attractionId, userId: req.user.id, bookingId, rating, title, comment,
      });

      await AttractionModel.updateStats(attractionId);
      return success(res, { review }, 'Review submitted.', 201);
    } catch (err) {
      if (err.code === '23505') return error(res, 'You have already reviewed this attraction.', 409);
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      await ReviewModel.delete(req.params.id);
      return success(res, {}, 'Review deleted.');
    } catch (err) { next(err); }
  },
};

module.exports = reviewController;
