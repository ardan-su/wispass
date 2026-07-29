/**
 * User Management Routes
 */
const express    = require('express');
const { body, param } = require('express-validator');
const { authenticate, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const userController = require('./userController');

const router = express.Router();

// All routes require auth + user:manage permission
router.use(authenticate, requirePermission('user:manage'));

// GET /api/users
router.get('/', userController.list);

// GET /api/users/:id
router.get('/:id',
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  userController.detail
);

// PUT /api/users/:id
router.put('/:id',
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('fullName').optional().isString().isLength({ max: 255 }),
    body('phone').optional().isString().isLength({ max: 30 }),
    body('roleId').optional().isInt({ min: 1 }),
  ],
  validate,
  userController.update
);

// PUT /api/users/:id/activate
router.put('/:id/activate',
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  userController.activate
);

// PUT /api/users/:id/deactivate
router.put('/:id/deactivate',
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  userController.deactivate
);

module.exports = router;
