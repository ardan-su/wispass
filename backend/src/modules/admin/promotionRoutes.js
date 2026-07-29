/**
 * Promotion Routes
 */
const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const promotionController = require('./promotionController');

const router = express.Router();

// Public endpoint – no auth required
router.post('/validate-code',
  [body('code').notEmpty().withMessage('Promo code is required.')],
  validate,
  promotionController.validateCode
);

// Admin endpoints
router.get('/', authenticate, promotionController.list);
router.get('/:id', authenticate, promotionController.detail);

router.post('/',
  authenticate, requirePermission('attraction:manage'),
  [
    body('code').notEmpty().isLength({ max: 50 }),
    body('name').notEmpty().isLength({ max: 255 }),
    body('discount_type').isIn(['percentage', 'fixed']),
    body('discount_value').isFloat({ min: 0 }),
    body('valid_from').isISO8601(),
    body('valid_until').isISO8601(),
  ],
  validate,
  promotionController.create
);

router.put('/:id',
  authenticate, requirePermission('attraction:manage'),
  [param('id').isUUID()],
  validate,
  promotionController.update
);

router.delete('/:id',
  authenticate, requirePermission('attraction:manage'),
  [param('id').isUUID()],
  validate,
  promotionController.remove
);

module.exports = router;
