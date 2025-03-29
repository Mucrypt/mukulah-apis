const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/auth');

// Public routes (read-only)
router.get('/', categoryController.getCategoryTree);
router.get('/:id', categoryController.getCategory);
router.get('/:id/products', categoryController.getCategoryProducts);

// Protected routes (require authentication)
router.use(auth.authenticate);

// Admin routes (require admin role)
router.use(auth.authorize('admin', 'superAdmin'));

router.post('/', categoryController.createCategory);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
