/**
 * Review Routes
 */
const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, optionalAuth } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const reviewController = require('./reviewController');

const router = express.Router();

// GET /api/reviews/:siteId – public
router.get('/:siteId',
  [param('siteId').isUUID().withMessage('Invalid site ID')],
  validate,
  reviewController.listBySite
);

// POST /api/reviews – authenticated
router.post('/',
  authenticate,
  [
    body('site_id').isUUID().withMessage('Valid site_id required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
    body('comment').notEmpty().isLength({ max: 1000 }).withMessage('Comment required (max 1000 chars)'),
    body('title').optional().isLength({ max: 255 }),
    body('order_id').optional().isUUID(),
  ],
  validate,
  reviewController.create
);

// DELETE /api/reviews/:id – authenticated
router.delete('/:id',
  authenticate,
  [param('id').isUUID().withMessage('Invalid review ID')],
  validate,
  reviewController.remove
);

module.exports = router;
