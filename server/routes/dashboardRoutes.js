const router = require('express').Router();
const ctrl   = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/admin',    authenticate, authorize('admin'),    ctrl.admin);
router.get('/customer', authenticate, authorize('customer'), ctrl.customer);

module.exports = router;
