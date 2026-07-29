const router = require('express').Router();
const ctrl   = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/',              authenticate, ctrl.list);
router.get('/unread-count',  authenticate, ctrl.unreadCount);
router.put('/read-all',      authenticate, ctrl.markAllRead);
router.put('/:id/read',      authenticate, ctrl.markRead);

module.exports = router;
