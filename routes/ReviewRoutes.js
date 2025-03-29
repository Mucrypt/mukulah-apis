const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');

// Public routes (read-only)
router.get('/product/:productId', reviewController.getProductReviews);
router.get('/:reviewId', reviewController.getReview);
router.get('/:reviewId/replies', reviewController.getReplies);

// Protected routes (require authentication)
router.use(auth.authenticate);

router.post('/product/:productId', reviewController.createReview);
router.patch('/:reviewId/helpful', reviewController.markHelpful);
router.post('/:reviewId/replies', reviewController.addReply);

// Admin routes (require admin role)
router.use(auth.authorize('admin', 'superAdmin'));

router.patch('/:reviewId/approve', reviewController.approveReview);
router.delete('/:reviewId', reviewController.deleteReview);

module.exports = router;
