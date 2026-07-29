const express = require('express');
const router  = express.Router();
const ctrl    = require('./ticketController');
const { authenticate, authorize } = require('../../middleware/auth');

const ADMIN = ['owner','super_admin','admin','gate_officer','cashier'];

router.get('/',                  authenticate, ctrl.listMine);
router.get('/code/:code',        authenticate, authorize(...ADMIN), ctrl.findByCode);
router.get('/:id',               authenticate, ctrl.detail);
router.post('/validate',         authenticate, authorize(...ADMIN), ctrl.validate);
router.post('/:id/regenerate-qr', authenticate, ctrl.regenerateQR);

module.exports = router;
