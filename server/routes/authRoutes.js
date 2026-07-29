const router     = require('express').Router();
const { body }   = require('express-validator');
const ctrl       = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate   = require('../middleware/validate');
const upload     = require('../config/multer');

const pwRules = [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('fullName').trim().notEmpty().withMessage('Full name required.'),
  ...pwRules,
], validate, ctrl.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').notEmpty().withMessage('Password required.'),
], validate, ctrl.login);

router.get('/me',              authenticate, ctrl.me);
router.put('/profile',         authenticate, upload.single('avatar'), ctrl.updateProfile);
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], validate, ctrl.changePassword);

module.exports = router;
