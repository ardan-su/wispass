const router   = require('express').Router();
const ctrl     = require('../controllers/attractionController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const upload   = require('../config/multer');

// Public
router.get('/',            ctrl.list);
router.get('/categories',  ctrl.categories);
router.get('/cities',      ctrl.cities);
router.get('/:idOrSlug',   ctrl.detail);

// Admin
router.get('/admin/all',   authenticate, authorize('admin'), ctrl.adminList);
router.post('/',           authenticate, authorize('admin'), upload.single('coverImage'), ctrl.create);
router.put('/:id',         authenticate, authorize('admin'), upload.single('coverImage'), ctrl.update);
router.delete('/:id',      authenticate, authorize('admin'), ctrl.remove);
router.post('/:id/images', authenticate, authorize('admin'), upload.single('image'),      ctrl.addImage);
router.delete('/images/:imageId', authenticate, authorize('admin'), ctrl.removeImage);

module.exports = router;
