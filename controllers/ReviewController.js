const ProductReview = require('../models/entities/ProductReview');
const AppError = require('../utils/appError');
const { Op } = require('sequelize');

const reviewController = {
  createReview: async (req, res, next) => {
    try {
      const { rating, title, comment, verifiedPurchase = false } = req.body;

      const newReview = await ProductReview.create({
        product_id: req.params.productId,
        customer_id: req.user.id,
        rating,
        title,
        comment,
        verified_purchase: verifiedPurchase,
      });

      res.status(201).json({
        status: 'success',
        data: {
          review: newReview,
        },
      });
    } catch (err) {
      next(new AppError(err.message, 500));
    }
  },

  getProductReviews: async (req, res, next) => {
    try {
      const { approved = 'true', page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const where = {
        product_id: req.params.productId,
      };

      if (approved === 'true') {
        where.is_approved = true;
      }

      const { rows, count } = await ProductReview.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      res.status(200).json({
        status: 'success',
        results: rows.length,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        data: {
          reviews: rows,
        },
      });
    } catch (err) {
      next(new AppError(err.message, 500));
    }
  },

  getReview: async (req, res, next) => {
    try {
      const review = await ProductReview.findByPk(req.params.reviewId);
      if (!review) {
        return next(new AppError('No review found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          review,
        },
      });
    } catch (err) {
      next(new AppError(err.message, 500));
    }
  },

  approveReview: async (req, res, next) => {
    try {
      const [updated] = await ProductReview.update(
        { is_approved: true },
        { where: { id: req.params.reviewId } }
      );

      if (updated === 0) {
        return next(new AppError('No review found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Review approved',
      });
    } catch (err) {
      next(new AppError(err.message, 500));
    }
  },

  markHelpful: async (req, res, next) => {
    try {
      const helpful = req.query.helpful !== 'false';
      const review = await ProductReview.findByPk(req.params.reviewId);
      if (!review) return next(new AppError('Review not found', 404));

      await review.increment(helpful ? 'helpful_count' : 'not_helpful_count');

      res.status(200).json({
        status: 'success',
        message: `Marked as ${helpful ? 'helpful' : 'not helpful'}`,
      });
    } catch (err) {
      next(new AppError(err.message, 500));
    }
  },

  addReply: async (req, res, next) => {
    // You would typically need a separate model for replies
    return next(new AppError('Replying to reviews is not implemented yet', 501));
  },

  getReplies: async (req, res, next) => {
    return next(new AppError('Fetching replies is not implemented yet', 501));
  },

  deleteReview: async (req, res, next) => {
    try {
      const deleted = await ProductReview.destroy({ where: { id: req.params.reviewId } });
      if (deleted === 0) {
        return next(new AppError('No review found with that ID', 404));
      }

      res.status(204).json({ status: 'success', data: null });
    } catch (err) {
      next(new AppError(err.message, 500));
    }
  },
};

module.exports = reviewController;
