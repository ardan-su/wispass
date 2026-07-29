const router = require('express').Router();
const ctrl   = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/mine',           authenticate,                   ctrl.listMine);
router.get('/code/:code',     authenticate, authorize('admin'), ctrl.findByCode);
router.post('/validate',      authenticate, authorize('admin'), ctrl.validate);
router.get('/:id',            authenticate,                   ctrl.detail);
router.post('/:id/regenerate-qr', authenticate,              ctrl.regenerateQR);

module.exports = router;
