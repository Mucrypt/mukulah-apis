const express = require('express');
const router = express.Router();
const cartController = require('../controllers/CartController');

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.put('/:itemId', cartController.updateCartItem);
router.delete('/:itemId', cartController.removeFromCart);

module.exports = router;
