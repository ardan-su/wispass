const router = require('express').Router();
const ctrl   = require('../controllers/customerController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/',                authenticate, authorize('admin'), ctrl.list);
router.get('/:id',             authenticate, authorize('admin'), ctrl.detail);
router.put('/:id',             authenticate, authorize('admin'), ctrl.update);
router.put('/:id/deactivate',  authenticate, authorize('admin'), ctrl.deactivate);
router.put('/:id/activate',    authenticate, authorize('admin'), ctrl.activate);

module.exports = router;
