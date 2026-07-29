const router = require('express').Router();
const ctrl   = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/revenue',            authenticate, authorize('admin'), ctrl.revenue);
router.get('/visitors',           authenticate, authorize('admin'), ctrl.visitors);
router.get('/popular-attractions',authenticate, authorize('admin'), ctrl.popularAttractions);
router.get('/ticket-sales',       authenticate, authorize('admin'), ctrl.ticketSales);

module.exports = router;
