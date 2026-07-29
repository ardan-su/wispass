const router = require('express').Router();
const ctrl   = require('../controllers/ticketTypeController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

router.get('/attraction/:attractionId',              optionalAuth, ctrl.listByAttraction);
router.get('/attraction/:attractionId/availability', ctrl.availability);
router.post('/attraction/:attractionId',  authenticate, authorize('admin'), ctrl.create);
router.put('/:id',                        authenticate, authorize('admin'), ctrl.update);
router.delete('/:id',                     authenticate, authorize('admin'), ctrl.remove);

module.exports = router;
