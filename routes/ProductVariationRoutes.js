const express = require('express');
const router = express.Router();
const productVariationController = require('../controllers/productVariationController');
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

module.exports = router;
