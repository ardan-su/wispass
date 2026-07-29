const router = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/bookingController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/',    authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.detail);

router.post('/', authenticate, authorize('customer'), [
  body('attractionId').isUUID().withMessage('Valid attraction ID required.'),
  body('visitDate').isDate().withMessage('Valid visit date required.'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required.'),
], validate, ctrl.create);

router.put('/:id/confirm',  authenticate, authorize('admin'),              ctrl.confirm);
router.put('/:id/cancel',   authenticate,                                  ctrl.cancel);
router.put('/:id/complete', authenticate, authorize('admin'),              ctrl.complete);

module.exports = router;
