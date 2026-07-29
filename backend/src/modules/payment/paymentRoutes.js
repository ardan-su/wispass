const express = require('express');
const router  = express.Router();
const ctrl    = require('./paymentController');
const { authenticate, authorize } = require('../../middleware/auth');
const { uploadPayment } = require('../../config/multer');

const ADMIN = ['owner','super_admin','admin','cashier'];

// Webhook – raw body set in app.js
router.post('/webhook', ctrl.webhook);

router.get('/booking/:bookingId', authenticate, ctrl.byBooking);
router.post('/:id/create-qris',  authenticate, ctrl.createQris);
router.get('/:id/status',        authenticate, ctrl.checkStatus);
router.post('/:id/confirm-sim',  authenticate, ctrl.confirmSimulated);
router.post('/:id/upload-proof', authenticate, uploadPayment.single('proof'), ctrl.uploadProof);
router.put('/:id/confirm',       authenticate, authorize(...ADMIN), ctrl.confirm);
router.put('/:id/reject',        authenticate, authorize(...ADMIN), ctrl.reject);

module.exports = router;
