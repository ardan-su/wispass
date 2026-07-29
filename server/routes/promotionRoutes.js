const router = require('express').Router();
const ctrl   = require('../controllers/promotionController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/',               authenticate, ctrl.list);
router.get('/:id',            authenticate, authorize('admin'), ctrl.detail);
router.post('/validate-code', authenticate, ctrl.validateCode);
router.post('/',              authenticate, authorize('admin'), ctrl.create);
router.put('/:id',            authenticate, authorize('admin'), ctrl.update);
router.delete('/:id',         authenticate, authorize('admin'), ctrl.remove);

module.exports = router;
