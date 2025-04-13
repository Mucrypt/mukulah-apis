// routes/sellerReturnRoutes.js
const express = require('express');
const router = express.Router();
const sellerReturnController = require('../../controllers/sellersController/sellerReturnController');
const auth = require('../../middleware/auth');

router.post('/orders/:id/return', auth.onlySeller, sellerReturnController.requestReturn);
router.get('/orders/returns', auth.onlySeller, sellerReturnController.getAllReturnRequests);
router.patch(
  '/orders/returns/:id/approve',
  auth.onlySeller,
  sellerReturnController.handleReturnApproval
);

module.exports = router;
