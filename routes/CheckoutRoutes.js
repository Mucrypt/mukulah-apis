const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/CheckoutController');
const { authenticate, authorize } = require('../middleware/auth'); // Updated path and destructured methods

// User routes
router.use(authenticate);

router.post('/', checkoutController.processCheckout);
router.get('/:id', checkoutController.getCheckoutDetails);
router.post('/shipping-options', checkoutController.getShippingOptions); // Ensure this is defined
router.post('/validate-payment', checkoutController.validatePayment);

module.exports = router;
