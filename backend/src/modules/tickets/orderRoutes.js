const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const ctrl     = require('./orderController');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const ADMIN_ROLES = ['owner','super_admin','admin','cashier'];

router.get('/',     authenticate, ctrl.list);
router.get('/:id',  authenticate, ctrl.detail);

router.post('/',
  authenticate, authorize('customer'),
  body('attractionId').isUUID(),
  body('visitDate').isDate(),
  body('items').isArray({ min: 1 }),
  validate,
  ctrl.create
);

router.put('/:id/confirm',  authenticate, authorize(...ADMIN_ROLES), ctrl.confirm);
router.put('/:id/cancel',   authenticate, ctrl.cancel);
router.put('/:id/complete', authenticate, authorize(...ADMIN_ROLES), ctrl.complete);

module.exports = router;
