/**
 * Branch Routes
 */
const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const branchController = require('./branchController');

const router = express.Router();

// Read endpoints – authenticated users only
router.get('/', authenticate, branchController.list);
router.get('/:id', authenticate,
  [param('id').isUUID()],
  validate,
  branchController.detail
);

// Write endpoints – require attraction:manage permission
router.post('/',
  authenticate, authorize('owner', 'super_admin', 'admin', 'marketing'),
  [
    body('tourist_site_id').isUUID().withMessage('Valid tourist_site_id required'),
    body('name').notEmpty().isLength({ max: 255 }),
    body('location').optional().isLength({ max: 500 }),
    body('is_active').optional().isBoolean(),
  ],
  validate,
  branchController.create
);

router.put('/:id',
  authenticate, authorize('owner', 'super_admin', 'admin', 'marketing'),
  [param('id').isUUID()],
  validate,
  branchController.update
);

router.delete('/:id',
  authenticate, authorize('owner', 'super_admin', 'admin', 'marketing'),
  [param('id').isUUID()],
  validate,
  branchController.remove
);

module.exports = router;
