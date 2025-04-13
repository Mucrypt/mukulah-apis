// sellerAuthRoutes.js
const express = require('express');
const router = express.Router();
const sellerAuthController = require('../../controllers/sellersController/sellerAuthController');
const auth = require('../../middleware/auth');

// 🔓 Public routes
router.post('/register', sellerAuthController.registerSeller);
router.get('/verify-email', sellerAuthController.verifyEmail);
router.post('/login', sellerAuthController.loginSeller);
router.post('/forgot-password', sellerAuthController.forgotPassword);
router.patch('/reset-password', sellerAuthController.resetPassword);

// 🔐 Protected routes (require token)
router.use(auth.authenticate); // 👈 All routes below will have access to `req.user`

router.get('/profile', auth.onlySeller, sellerAuthController.getSellerProfile);
router.patch('/profile', auth.onlySeller, sellerAuthController.updateSellerProfile);
router.post('/logout', auth.onlySeller, sellerAuthController.logoutSeller);

module.exports = router;
