const express  = require('express');
const router   = express.Router();
const { body, query } = require('express-validator');
const ctrl     = require('./qrController');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const auditLog = require('../../middleware/auditLog');

// All routes require authentication
router.use(authenticate);

// ── Stats (dashboard widgets) ─────────────────────────────────────────────────
router.get('/stats',
  authorize('owner','super_admin','admin','cashier','gate_officer','marketing','viewer'),
  ctrl.stats
);

// ── Scan history (all QRs) ────────────────────────────────────────────────────
router.get('/history',
  authorize('owner','super_admin','admin','gate_officer','marketing'),
  ctrl.history
);

// ── List QR codes ─────────────────────────────────────────────────────────────
router.get('/',
  authorize('owner','super_admin','admin','cashier','marketing','viewer'),
  ctrl.list
);

// ── Create QR ─────────────────────────────────────────────────────────────────
router.post('/create',
  authorize('owner','admin'),
  body('siteId').optional().isUUID(),
  body('branchId').optional().isUUID(),
  body('ticketId').optional().isUUID(),
  body('orderId').optional().isUUID(),
  body('expiryHours').optional().isInt({ min: 1, max: 720 }),
  body('maxScans').optional().isInt({ min: 1, max: 100 }),
  validate,
  auditLog('create', 'qr'),
  ctrl.create
);

// ── Scan QR ───────────────────────────────────────────────────────────────────
router.post('/scan',
  authorize('gate_officer','admin','owner','super_admin'),
  body('qrData').notEmpty().withMessage('qrData is required.'),
  validate,
  ctrl.scan
);

// ── Get QR detail ─────────────────────────────────────────────────────────────
router.get('/:id',
  authorize('owner','super_admin','admin','cashier','marketing','viewer'),
  ctrl.detail
);

// ── Update QR ─────────────────────────────────────────────────────────────────
router.put('/:id',
  authorize('owner','admin'),
  body('status').optional().isIn(['active','deactivated']),
  validate,
  auditLog('update', 'qr'),
  ctrl.update
);

// ── Delete QR (soft) ──────────────────────────────────────────────────────────
router.delete('/:id',
  authorize('owner','admin'),
  auditLog('delete', 'qr'),
  ctrl.remove
);

// ── Regenerate QR ─────────────────────────────────────────────────────────────
router.post('/:id/regenerate',
  authorize('owner','admin'),
  auditLog('regenerate', 'qr'),
  ctrl.regenerate
);

// ── Download PNG ──────────────────────────────────────────────────────────────
router.get('/:id/download/png',
  authorize('owner','super_admin','admin','cashier'),
  ctrl.downloadPng
);

// ── Download PDF/HTML ─────────────────────────────────────────────────────────
router.get('/:id/download/pdf',
  authorize('owner','super_admin','admin','cashier'),
  ctrl.downloadPdf
);

module.exports = router;
