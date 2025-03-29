const express = require('express');
const router = express.Router();
const productRelationshipController = require('../controllers/productRelationshipController');
const auth = require('../middleware/auth');

// Protected routes (require authentication)
router.use(auth.authenticate);

// Admin routes (require admin role)
router.use(auth.authorize('admin', 'superAdmin'));

router.post('/:productId/related', productRelationshipController.addRelatedProducts);
router.post('/:productId/cross-sell', productRelationshipController.addCrossSellProducts);
router.post('/:productId/up-sell', productRelationshipController.addUpSellProducts);
router.delete('/:productId/related', productRelationshipController.removeRelatedProducts);
router.delete('/:productId/cross-sell', productRelationshipController.removeCrossSellProducts);
router.delete('/:productId/up-sell', productRelationshipController.removeUpSellProducts);
router.patch(
  '/:productId/positions/:relationshipType',
  productRelationshipController.updateRelationshipPositions
);

module.exports = router;
