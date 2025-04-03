const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');
const { authenticate, authorize } = require('../middleware/auth'); // Updated path and destructured methods

// User routes
router.use(authenticate);

router.post('/', orderController.createOrder);
router.get('/', orderController.getUserOrders);

// Admin routes
router.use(authorize('admin', 'superAdmin'));
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;
