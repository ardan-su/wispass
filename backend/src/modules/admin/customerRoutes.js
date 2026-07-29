/**
 * Customer Routes – admin management of customer accounts
 */
const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const customerController = require('./customerController');

const router = express.Router();

// All routes require auth + user:manage permission
router.use(authenticate, requirePermission('user:manage'));

router.get('/', customerController.list);

router.get('/:id',
  [param('id').isUUID().withMessage('Invalid customer ID')],
  validate,
  customerController.detail
);

router.put('/:id',
  [
    param('id').isUUID().withMessage('Invalid customer ID'),
    body('fullName').optional().isString().isLength({ max: 255 }),
    body('phone').optional().isString().isLength({ max: 30 }),
  ],
  validate,
  customerController.update
);

router.put('/:id/activate',
  [param('id').isUUID()], validate,
  customerController.activate
);

router.put('/:id/deactivate',
  [param('id').isUUID()], validate,
  customerController.deactivate
);

module.exports = router;
