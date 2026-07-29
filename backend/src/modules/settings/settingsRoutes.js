/**
 * Settings Routes
 */
const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const settingsController = require('./settingsController');

const router = express.Router();

// All settings routes require auth + settings:manage permission
router.use(authenticate, requirePermission('settings:manage'));

router.get('/', settingsController.listAll);

router.get('/:key',
  [param('key').notEmpty().matches(/^[\w:.-]+$/).withMessage('Invalid setting key')],
  validate,
  settingsController.getByKey
);

router.put('/:key',
  [
    param('key').notEmpty().matches(/^[\w:.-]+$/).withMessage('Invalid setting key'),
    body('value').notEmpty().withMessage('Value is required'),
  ],
  validate,
  settingsController.updateByKey
);

module.exports = router;
