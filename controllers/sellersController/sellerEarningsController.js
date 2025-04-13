// controllers/sellerEarningsController.js
const { Op, fn, col, literal } = require('sequelize');
const Order = require('../../models/entities/Order');
const Seller = require('../../models/entities/Seller');
const Product = require('../../models/entities/Product');
const AppError = require('../../utils/appError');

const sellerEarningsController = {
  // GET /seller/earnings
  getEarningsOverview: async (req, res, next) => {
    try {
      const sellerId = req.user.id;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

      const earnings = await Order.findAll({
        attributes: [
          [fn('MONTH', col('created_at')), 'month'],
          [fn('YEAR', col('created_at')), 'year'],
          [fn('SUM', col('total_price')), 'total_sales'],
          [fn('COUNT', col('id')), 'orders_count'],
        ],
        where: {
          seller_id: sellerId,
          payment_status: 'paid',
          created_at: {
            [Op.gte]: start,
          },
        },
        group: [fn('YEAR', col('created_at')), fn('MONTH', col('created_at'))],
        order: [
          [fn('YEAR', col('created_at')), 'ASC'],
          [fn('MONTH', col('created_at')), 'ASC'],
        ],
      });

      res.status(200).json({ status: 'success', data: { earnings } });
    } catch (err) {
      next(err);
    }
  },

  // GET /seller/payouts
  getPayouts: async (req, res, next) => {
    try {
      const sellerId = req.user.id;
      const payouts = await Seller.findByPk(sellerId, {
        attributes: ['id', 'name', 'payment_method', 'payment_details'],
        include: [
          {
            association: 'payouts',
            attributes: ['id', 'amount', 'method', 'status', 'created_at'],
          },
        ],
      });

      res.status(200).json({ status: 'success', data: payouts });
    } catch (err) {
      next(err);
    }
  },

  // GET /seller/payouts/:id
  getPayoutDetail: async (req, res, next) => {
    try {
      const sellerId = req.user.id;
      const payoutId = parseInt(req.params.id);

      const payout = await Payout.findOne({
        where: { id: payoutId, seller_id: sellerId },
      });

      if (!payout) return next(new AppError('Payout not found', 404));

      res.status(200).json({ status: 'success', data: payout });
    } catch (err) {
      next(err);
    }
  },
  getAllPayouts: async (req, res, next) => {
    try {
      const sellerId = req.user.id;

      const payouts = await Seller.findByPk(sellerId, {
        attributes: ['id', 'name', 'payment_method', 'payment_details'],
        include: [
          {
            association: 'payouts',
            attributes: ['id', 'amount', 'method', 'status', 'created_at'],
          },
        ],
      });

      if (!payouts) {
        return next(new AppError('No payouts found for this seller', 404));
      }

      res.status(200).json({
        status: 'success',
        data: payouts,
      });
    } catch (err) {
      next(new AppError(err.message || 'Failed to fetch payouts', 500));
    }
  },
};

module.exports = sellerEarningsController;
