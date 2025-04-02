const express = require('express');
const router = express.Router();
const productVariationController = require('../controllers/ProductVariationController');
const auth = require('../middleware/auth');

// Protected routes (require authentication)
router.use(auth.authenticate);

// Admin routes (require admin role)
router.use(auth.authorize('admin', 'superAdmin'));

router.post('/:productId', productVariationController.createVariation);
router.patch('/:variationId/default/:productId', productVariationController.setDefaultVariation);
router.patch('/:variationId', productVariationController.updateVariation);
router.patch('/:variationId/stock', productVariationController.updateVariationStock);
router.delete('/:variationId', productVariationController.deleteVariation);

// Add these routes after your existing routes
router.get('/:productId/variations', productVariationController.getAllVariations);
router.get('/:productId/attributes', productVariationController.getProductAttributes);
router.get('/:variationId', productVariationController.getVariationById);
router.post('/:productId/generate-combinations', productVariationController.generateCombinations);
router.post('/:productId/bulk-create', productVariationController.bulkCreateVariations);
router.patch('/:variationId/status', productVariationController.updateVariationStatus);
router.post('/:variationId/image', productVariationController.addVariationImage);
router.delete('/:variationId/image/:imageId', productVariationController.removeVariationImage);
router.get('/:productId/with-attributes', productVariationController.getAllVariationsWithAttributes);
router.patch('/bulk/stock', productVariationController.bulkUpdateStock);
router.post('/:productId/generate-skus', productVariationController.generateSkus);

module.exports = router;
