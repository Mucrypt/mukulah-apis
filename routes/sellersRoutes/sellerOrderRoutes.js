const express = require('express');
const router = express.Router();
const sellerOrderController = require('../../controllers/sellersController/sellerOrderController');
const auth = require('../../middleware/auth');

router.get('/orders', auth.onlySeller, sellerOrderController.getAllOrders);
router.get('/orders/:id', auth.onlySeller, sellerOrderController.getOrderDetails);
router.patch('/orders/:id/status', auth.onlySeller, sellerOrderController.updateOrderStatus);
router.post('/orders/:id/refund', auth.onlySeller, sellerOrderController.initiateRefund);
router.get('/sales/report', auth.onlySeller, sellerOrderController.getSalesReport);
router.get('/transactions', auth.onlySeller, sellerOrderController.getTransactionHistory);
router.post('/orders/:id/cancel', auth.onlySeller, sellerOrderController.cancelOrder);


module.exports = router;
