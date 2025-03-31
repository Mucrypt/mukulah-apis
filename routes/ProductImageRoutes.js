const express = require('express');
const router = express.Router();
const productImageController = require('../controllers/productImageController');
const auth = require('../middleware/auth');

// Protected routes (require authentication)
router.use(auth.authenticate);

// Admin routes (require admin role)
router.use(auth.authorize('admin', 'superAdmin'));

router.post('/', productImageController.addProductImage);
router.get('/', productImageController.getProductImages);
router.patch('/:imageId/primary/:productId', productImageController.setPrimaryImage);
router.patch('/:imageId/position', productImageController.updateImagePosition);
router.delete('/:imageId', productImageController.deleteProductImage);

module.exports = router;
