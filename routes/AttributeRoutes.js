const express = require('express');
const router = express.Router();
const attributeController = require('../controllers/AttributeController');
const auth = require('../middleware/auth');

// Public routes (read-only)
router.get('/', attributeController.getAllAttributes);
router.get('/:id', attributeController.getAttribute);
router.get('/:id/values', attributeController.getAttributeValues);

// Protected routes (require authentication)
router.use(auth.authenticate);

// Admin routes (require admin role)
router.use(auth.authorize('admin', 'superAdmin'));

router.post('/', attributeController.createAttribute);
router.post('/:id/values', attributeController.addAttributeValue);
router.patch('/:id', attributeController.updateAttribute);
router.delete('/:id', attributeController.deleteAttribute);

module.exports = router;
