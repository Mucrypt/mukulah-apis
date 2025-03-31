const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
const auth = require('../middleware/auth');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);
router.get('/:id/related', productController.getRelatedProducts);
router.get('/:id/cross-sell', productController.getCrossSellProducts);
router.get('/:id/up-sell', productController.getUpSellProducts);
router.patch('/:id/views', productController.incrementProductViews);
// In ProductRoutes.js
router.get(
  '/:id/complete',
  productController.getCompleteProductDetails
);

// Protected admin routes
router.post(
  '/',
  auth.authenticate,
  auth.authorize('admin', 'superAdmin'),
  productController.createProduct
);

router.patch(
  '/:id',
  auth.authenticate,
  auth.authorize('admin', 'superAdmin'),
  productController.updateProduct
);

router.delete(
  '/:id',
  auth.authenticate,
  auth.authorize('admin', 'superAdmin'),
  productController.deleteProduct
);

module.exports = router;
