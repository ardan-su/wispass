const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const ctrl     = require('./authController');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { uploadAvatar } = require('../../config/multer');

// POST /api/auth/register
router.post('/register',
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 chars.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars.'),
  validate,
  ctrl.register
);

// POST /api/auth/login
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  ctrl.login
);

// POST /api/auth/refresh
router.post('/refresh', ctrl.refreshToken);

// GET /api/auth/me
router.get('/me', authenticate, ctrl.me);

// PUT /api/auth/profile
router.put('/profile', authenticate, uploadAvatar.single('avatar'), ctrl.updateProfile);

// PUT /api/auth/change-password
router.put('/change-password',
  authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  validate,
  ctrl.changePassword
);

module.exports = router;
