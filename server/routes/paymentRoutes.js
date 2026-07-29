const router = require('express').Router();
const ctrl   = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../config/multer');

// ── Midtrans webhook (public – no JWT) ────────────────────────
router.post('/webhook', ctrl.webhook);

// ── Customer & admin routes ───────────────────────────────────
router.get( '/booking/:bookingId', authenticate, ctrl.byBooking);
router.post('/:id/create-qris',   authenticate, ctrl.createQris);
router.get( '/:id/status',        authenticate, ctrl.checkStatus);
router.post('/:id/confirm-sim',   authenticate, ctrl.confirmSimulated);
router.post('/:id/upload-proof',  authenticate, upload.single('proof'), ctrl.uploadProof);
router.put( '/:id/confirm',       authenticate, authorize('admin'), ctrl.confirm);
router.put( '/:id/reject',        authenticate, authorize('admin'), ctrl.reject);

module.exports = router;
