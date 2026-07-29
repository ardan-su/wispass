const express = require('express');
const router  = express.Router();
const ctrl    = require('./dashboardController');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/admin',    authenticate, authorize('owner','super_admin','admin','cashier','marketing','viewer'), ctrl.admin);
router.get('/customer', authenticate, ctrl.customer);

module.exports = router;
