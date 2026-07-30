const express = require('express');
const router  = express.Router();
const ctrl    = require('./ticketController');
const { authenticate, authorize } = require('../../middleware/auth');

const ADMIN = ['owner','super_admin','admin','gate_officer','cashier'];

// Admin-only routes MUST come before /:id to avoid route shadowing
router.get('/admin/all',           authenticate, authorize(...ADMIN), ctrl.adminList);
router.get('/admin/stats',         authenticate, authorize(...ADMIN), ctrl.adminStats);
router.put('/admin/:id/status',    authenticate, authorize(...ADMIN), ctrl.adminUpdateStatus);

router.get('/code/:code',        authenticate, authorize(...ADMIN), ctrl.findByCode);
router.post('/validate',         authenticate, authorize(...ADMIN), ctrl.validate);

router.get('/',                  authenticate, ctrl.listMine);
router.get('/:id',               authenticate, ctrl.detail);
router.post('/:id/regenerate-qr', authenticate, ctrl.regenerateQR);

module.exports = router;
