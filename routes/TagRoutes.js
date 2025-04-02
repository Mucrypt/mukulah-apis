const express = require('express');
const router = express.Router();
const tagController = require('../controllers/TagController');
const auth = require('../middleware/auth');

// Public routes (read-only)
router.get('/', tagController.getAllTags);
router.get('/:id', tagController.getTag);
router.get('/:id/products', tagController.getTagProducts);

// Protected routes (require authentication)
router.use(auth.authenticate);

// Admin routes (require admin role)
router.use(auth.authorize('admin', 'superAdmin'));

router.post('/', tagController.createTag);
router.post('/:tagId/product/:productId', tagController.addTagToProduct);
router.delete('/:tagId/product/:productId', tagController.removeTagFromProduct);
router.patch('/:id', tagController.updateTag);
router.delete('/:id', tagController.deleteTag);

module.exports = router;
