const express = require('express');
const router  = express.Router();
const ctrl    = require('./reportController');
const { authenticate, authorize } = require('../../middleware/auth');

const RPT_ROLES = ['owner','super_admin','admin','marketing','viewer'];

router.get('/revenue',             authenticate, authorize(...RPT_ROLES), ctrl.revenue);
router.get('/visitors',            authenticate, authorize(...RPT_ROLES), ctrl.visitors);
router.get('/popular-attractions', authenticate, authorize(...RPT_ROLES), ctrl.popularAttractions);
router.get('/ticket-sales',        authenticate, authorize(...RPT_ROLES), ctrl.ticketSales);
router.get('/qr-scans',            authenticate, authorize(...RPT_ROLES), ctrl.qrScans);

module.exports = router;
