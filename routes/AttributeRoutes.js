const express = require('express');
const router = express.Router();
const attributeController = require('../controllers/AttributeController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes (read-only)
router.get('/', attributeController.getAllAttributes);
router.get('/:id', attributeController.getAttributeById);
router.get('/:id/values', attributeController.getAttributeValues);

// Protected routes (require authentication)
router.use(auth.authenticate);

// Admin routes (require admin role)
router.use(auth.authorize('admin', 'superAdmin'));

router.post('/', attributeController.createAttribute);
router.post('/:id/values', attributeController.createAttributeValue);
router.patch('/:id', attributeController.updateAttribute);
router.delete('/:id', attributeController.deleteAttribute);


router.post(
  '/:id/values/upload',
  upload.single('image'),
  attributeController.uploadAttributeValueImage
);


module.exports = router;
