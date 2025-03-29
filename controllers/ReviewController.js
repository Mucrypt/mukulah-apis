const { pool } = require('../config/db');
const AppError = require('../utils/appError');

const reviewController = {
  // Create review
  createReview: async (req, res, next) => {
    try {
      const { rating, title, comment } = req.body;
      const review = new (require('../models/ReviewModel'))(pool);

      const reviewId = await review.create({
        productId: req.params.productId,
        customerId: req.user.id,
        rating,
        title,
        comment,
        verifiedPurchase: req.body.verifiedPurchase || false,
      });

      res.status(201).json({
        status: 'success',
        data: {
          reviewId,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get product reviews
  getProductReviews: async (req, res, next) => {
    try {
      const { approved, page = 1, limit = 10 } = req.query;
      const review = new (require('../models/ReviewModel'))(pool);

      const reviews = await review.findByProduct(req.params.productId, {
        approvedOnly: approved !== 'false',
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.status(200).json({
        status: 'success',
        results: reviews.reviews.length,
        total: reviews.total,
        page: reviews.page,
        pages: Math.ceil(reviews.total / reviews.limit),
        data: {
          reviews: reviews.reviews,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get single review
  getReview: async (req, res, next) => {
    try {
      const review = new (require('../models/ReviewModel'))(pool);
      const reviewData = await review.findById(req.params.reviewId);

      if (!reviewData) {
        return next(new AppError('No review found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          review: reviewData,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Approve review
  approveReview: async (req, res, next) => {
    try {
      const review = new (require('../models/ReviewModel'))(pool);
      const updatedRows = await review.approve(req.params.reviewId);

      if (updatedRows === 0) {
        return next(new AppError('No review found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Review approved',
      });
    } catch (err) {
      next(err);
    }
  },

  // Mark review as helpful
  markHelpful: async (req, res, next) => {
    try {
      const { helpful } = req.query;
      const review = new (require('../models/ReviewModel'))(pool);
      await review.markHelpful(req.params.reviewId, req.user.id, helpful !== 'false');

      res.status(200).json({
        status: 'success',
        message: 'Review marked as helpful',
      });
    } catch (err) {
      next(err);
    }
  },

  // Add reply to review
  addReply: async (req, res, next) => {
    try {
      const { comment } = req.body;
      const review = new (require('../models/ReviewModel'))(pool);

      const replyId = await review.addReply(req.params.reviewId, req.user.id, comment);

      res.status(201).json({
        status: 'success',
        data: {
          replyId,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get review replies
  getReplies: async (req, res, next) => {
    try {
      const review = new (require('../models/ReviewModel'))(pool);
      const replies = await review.getReplies(req.params.reviewId);

      res.status(200).json({
        status: 'success',
        results: replies.length,
        data: {
          replies,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete review
  deleteReview: async (req, res, next) => {
    try {
      const review = new (require('../models/ReviewModel'))(pool);
      const deletedRows = await review.delete(req.params.reviewId);

      if (deletedRows === 0) {
        return next(new AppError('No review found with that ID', 404));
      }

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = reviewController;
