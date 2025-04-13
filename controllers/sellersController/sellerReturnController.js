// backend/controllers/sellerReturnController.js

const { Order, Product, OrderItem, User } = require('../../models/associations');
const AppError = require('../../utils/appError');
const { Op } = require('sequelize');
const { sendMail } = require('../../services/emailService');

const sellerReturnController = {
  // POST /seller/orders/:id/return
  requestReturn: async (req, res, next) => {
    try {
      const orderId = req.params.id;
      const sellerId = req.user.id;
      const { reason } = req.body;

      const order = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, include: [Product] }, User],
      });

      if (!order) return next(new AppError('Order not found', 404));

      const hasSellerProduct = order.OrderItems.some(
        (item) => item.Product && item.Product.seller_id === sellerId
      );
      if (!hasSellerProduct) return next(new AppError('Unauthorized', 403));

      order.return_requested = true;
      order.return_reason = reason;
      order.return_status = 'pending';
      await order.save();

      res.status(200).json({ status: 'success', message: 'Return requested' });
    } catch (err) {
      next(new AppError('Failed to request return', 500));
    }
  },

  // GET /seller/orders/returns
  getAllReturnRequests: async (req, res, next) => {
    try {
      const sellerId = req.user.id;

      const orders = await Order.findAll({
        where: {
          return_requested: true,
          '$OrderItems.Product.seller_id$': sellerId,
        },
        include: [{ model: OrderItem, include: [Product] }, User],
        order: [['created_at', 'DESC']],
      });

      res.status(200).json({ status: 'success', data: { orders } });
    } catch (err) {
      next(new AppError('Failed to fetch return requests', 500));
    }
  },

  // PATCH /seller/orders/returns/:id/approve
  handleReturnApproval: async (req, res, next) => {
    try {
      const orderId = req.params.id;
      const { action } = req.body; // 'approve' or 'deny'
      const sellerId = req.user.id;

      const order = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, include: [Product] }, User],
      });

      if (!order) return next(new AppError('Order not found', 404));

      const hasSellerProduct = order.OrderItems.some(
        (item) => item.Product && item.Product.seller_id === sellerId
      );
      if (!hasSellerProduct) return next(new AppError('Unauthorized', 403));

      if (action === 'approve') {
        order.return_status = 'approved';
        order.status = 'refunded';
      } else {
        order.return_status = 'denied';
      }

      await order.save();

      // Optional: Email to buyer
      await sendMail({
        to: order.User.email,
        subject: `Return ${order.return_status} for Order #${order.id}`,
        html: `<p>Your return request has been <strong>${order.return_status}</strong>.</p>`,
      });

      res.status(200).json({
        status: 'success',
        message: `Return ${order.return_status}`,
      });
    } catch (err) {
      next(new AppError('Failed to process return approval', 500));
    }
  },
};

module.exports = sellerReturnController;
