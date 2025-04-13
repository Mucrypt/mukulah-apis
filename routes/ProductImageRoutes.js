const express = require('express');
const router = express.Router();
const productImageController = require('../controllers/ProductImageController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Protect all routes
router.use(auth.authenticate);

// ----------------------- ADMIN ROUTES -----------------------
router.post(
  '/admin/products/:productId/images',
  auth.onlyAdmin(),
  upload.array('images', 10),
  productImageController.uploadProductImages
);

router.get(
  '/admin/products/:productId/images',
  auth.onlyAdmin(),
  productImageController.getAdminProductImages
);

router.patch(
  '/admin/images/:imageId/primary/:productId',
  auth.onlyAdmin(),
  productImageController.setPrimaryImage
);

router.patch(
  '/admin/images/:imageId/position',
  auth.onlyAdmin(),
  productImageController.updateImagePosition
);

router.patch(
  '/admin/images/:imageId/alt-text',
  auth.onlyAdmin(),
  productImageController.updateAltText
);

router.get(
  '/admin/products/:productId/primary-image',
  auth.onlyAdmin(),
  productImageController.getPrimaryImage
);

router.post('/admin/images/reorder', auth.onlyAdmin(), productImageController.reorderImages);

router.post('/admin/images/batch-delete', auth.onlyAdmin(), productImageController.batchDelete);

router.delete(
  '/admin/images/:imageId',
  auth.onlyAdmin(),
  productImageController.deleteProductImage
);

// ----------------------- SELLER ROUTES -----------------------
router.post(
  '/seller/products/:productId/images',
  auth.onlySeller(),
  upload.array('images', 10),
  productImageController.sellerUploadImages
);

router.get(
  '/seller/products/:productId/images',
  auth.onlySeller(),
  productImageController.getSellerProductImages
);

router.patch(
  '/seller/images/:imageId/primary/:productId',
  auth.onlySeller(),
  productImageController.setPrimaryImage
);

router.patch(
  '/seller/images/:imageId/position',
  auth.onlySeller(),
  productImageController.updateImagePosition
);

router.patch(
  '/seller/images/:imageId/alt-text',
  auth.onlySeller(),
  productImageController.updateAltText
);

router.get(
  '/seller/products/:productId/primary-image',
  auth.onlySeller(),
  productImageController.getPrimaryImage
);

router.post('/seller/images/reorder', auth.onlySeller(), productImageController.reorderImages);

router.post('/seller/images/batch-delete', auth.onlySeller(), productImageController.batchDelete);

router.delete(
  '/seller/images/:imageId',
  auth.onlySeller(),
  productImageController.deleteProductImage
);

module.exports = router;
