const express = require('express');
const router = express.Router();
const sellersController = require('../controllers/sellersController');

/**
 * @swagger
 * tags:
 *   name: Sellers
 *   description: Seller management
 */

/**
 * @swagger
 * /sellers:
 *   get:
 *     summary: Get all sellers
 *     tags: [Sellers]
 *     responses:
 *       200:
 *         description: List of sellers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Seller'
 */
router.get('/', sellersController.getAllSellers);

/**
 * @swagger
 * /sellers/{id}:
 *   get:
 *     summary: Get a seller by ID
 *     tags: [Sellers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Seller ID
 *     responses:
 *       200:
 *         description: Seller data
 */
router.get('/:id', sellersController.getSellerById);

/**
 * @swagger
 * /sellers:
 *   post:
 *     summary: Create a new seller
 *     tags: [Sellers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Seller'
 *     responses:
 *       201:
 *         description: Seller created
 */
router.post('/', sellersController.createSeller);

/**
 * @swagger
 * /sellers/{id}:
 *   put:
 *     summary: Update a seller
 *     tags: [Sellers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Seller'
 *     responses:
 *       200:
 *         description: Seller updated
 */
router.put('/:id', sellersController.updateSeller);

/**
 * @swagger
 * /sellers/{id}:
 *   delete:
 *     summary: Delete a seller
 *     tags: [Sellers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Seller deleted
 */
router.delete('/:id', sellersController.deleteSeller);

/**
 * @swagger
 * /sellers/{id}/products:
 *   post:
 *     summary: Create a product under a seller
 *     tags: [Sellers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Seller ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Product created
 */
router.post('/:id/products', sellersController.createProduct);

/**
 * @swagger
 * components:
 *   schemas:
 *     Seller:
 *       type: object
 *       required:
 *         - user_id
 *         - business_name
 *         - business_slug
 *         - business_email
 *         - business_phone
 *         - business_address
 *         - payment_method
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         business_name:
 *           type: string
 *         business_slug:
 *           type: string
 *         business_email:
 *           type: string
 *         business_phone:
 *           type: string
 *         business_address:
 *           type: string
 *         payment_method:
 *           type: string
 *           enum: [bank_transfer, paypal, stripe]
 */

module.exports = router;
