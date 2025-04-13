const express = require('express');
const router = express.Router();
const sellerProductController = require('../../controllers/sellersController/sellerProductController');
const auth = require('../../middleware/auth');
const upload = require('../../middleware/upload');

// ✅ This applies authentication and checks role is seller
router.use(auth.authenticate, auth.onlySeller);

// All routes require seller authentication
router.post('/', auth.onlySeller, sellerProductController.createProduct);
router.get('/', auth.onlySeller, sellerProductController.getMyProducts);
router.patch('/:id', auth.onlySeller, sellerProductController.updateMyProduct);
router.delete('/:id', auth.onlySeller, sellerProductController.deleteMyProduct);


router.post(
  '/products/bulk-upload',
  auth.onlySeller,
  upload.single('file'),
  sellerProductController.bulkUploadProducts
);

// Duplicate a product
router.post('/products/duplicate/:id', auth.onlySeller, sellerProductController.duplicateProduct);
// Update product status
router.patch('/products/:id/status', auth.onlySeller, sellerProductController.updateProductStatus);
//
// Get low-stock products
router.get('/products/low-stock', auth.onlySeller, sellerProductController.getLowStockProducts);

// Get product analytics
router.get('/products/analytics/:id', auth.onlySeller, sellerProductController.getProductAnalytics);

// Export seller products as CSV
router.get('/products/export', auth.onlySeller, sellerProductController.exportProductsAsCSV);





module.exports = router;
