const express = require('express');
const router = express.Router();
const cartController = require('../controllers/CartController');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management
 */

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get user's shopping cart
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 */
router.get('/', cartController.getCart);

// Authenticated routes
router.use(authenticate);

/**
 * @swagger
 * /cart:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *               size:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item added to cart
 */
router.post('/', cartController.addToCart);

/**
 * @swagger
 * /cart/items/{itemId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cart item updated
 */
router.put('/items/:itemId', cartController.updateCartItem);

/**
 * @swagger
 * /cart/items/{itemId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item removed from cart
 */
router.delete('/items/:itemId', cartController.removeFromCart);

/**
 * @swagger
 * /cart/apply-coupon:
 *   post:
 *     summary: Apply coupon to cart
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               couponCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 */
router.post('/apply-coupon', cartController.applyCoupon);

/**
 * @swagger
 * /cart/merge:
 *   post:
 *     summary: Merge guest cart with user cart
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Carts merged successfully
 */
router.post('/merge', cartController.mergeCarts);

module.exports = router;
