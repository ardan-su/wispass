const router = require('express').Router();
const ctrl   = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/:attractionId/reviews',    ctrl.list);
router.post('/:attractionId/reviews',   authenticate, authorize('customer'), ctrl.create);
router.delete('/reviews/:id',           authenticate, authorize('admin'),    ctrl.remove);

module.exports = router;
