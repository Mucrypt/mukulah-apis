const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');

// Public routes (read-only)
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);
router.get('/:id/related', productController.getRelatedProducts);
router.get('/:id/cross-sell', productController.getCrossSellProducts);
router.get('/:id/up-sell', productController.getUpSellProducts);
router.patch('/:id/views', productController.incrementProductViews);

// Protected routes (require authentication)
router.use(auth.authenticate);

// Admin routes (require admin role)
router.use(auth.authorize('admin', 'superAdmin'));

router.post('/', productController.createProduct);
router.patch('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
