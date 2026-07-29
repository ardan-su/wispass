/**
 * Notification Routes
 */
const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, requirePermission } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const notificationController = require('./notificationController');

const router = express.Router();

// All routes require auth
router.use(authenticate);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.put('/read-all', notificationController.markAllRead);

router.put('/:id/read',
  [param('id').isUUID().withMessage('Invalid notification ID')],
  validate,
  notificationController.markRead
);

router.post('/',
  requirePermission('attraction:manage'),
  [
    body('user_id').isUUID().withMessage('Valid user_id required'),
    body('title').notEmpty().isLength({ max: 255 }),
    body('message').notEmpty().isLength({ max: 1000 }),
    body('type').optional().isIn(['info', 'success', 'warning', 'error']),
  ],
  validate,
  notificationController.create
);

module.exports = router;
