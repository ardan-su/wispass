const express = require('express');
const router  = express.Router();
const ctrl    = require('./siteController');
const { authenticate, authorize } = require('../../middleware/auth');
const { uploadAttrImage } = require('../../config/multer');
const { optionalAuth }    = require('../../middleware/auth');

const ADMIN = ['owner','super_admin','admin'];

router.get('/categories',  ctrl.categories);
router.get('/cities',      ctrl.cities);
router.get('/admin',       authenticate, authorize(...ADMIN), ctrl.adminList);
router.get('/:idOrSlug',   optionalAuth, ctrl.detail);
router.get('/',            optionalAuth, ctrl.list);
router.post('/',           authenticate, authorize(...ADMIN), uploadAttrImage.single('cover'), ctrl.create);
router.put('/:id',         authenticate, authorize(...ADMIN), uploadAttrImage.single('cover'), ctrl.update);
router.delete('/images/:imageId', authenticate, authorize(...ADMIN), ctrl.removeImage);
router.post('/:id/images', authenticate, authorize(...ADMIN), uploadAttrImage.single('image'), ctrl.addImage);
router.delete('/:id',      authenticate, authorize(...ADMIN), ctrl.remove);

module.exports = router;
