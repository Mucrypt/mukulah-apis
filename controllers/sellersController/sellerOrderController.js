// backend/controllers/sellerOrderController.js

const {  OrderItem, Product, User, Seller } = require('../../models/associations');

const { Op } = require('sequelize');
  const stripe = require('../../config/stripe');
const AppError = require('../../utils/appError');
// ✅ Correct
const Order = require('../../models/entities/Order');

const { Parser } = require('json2csv');

const sellerOrderController = {
  // GET /seller/orders
  getAllOrders: async (req, res, next) => {
    try {
      const sellerId = req.user.id;

      const orders = await Order.findAll({
        include: [
          {
            model: OrderItem,
            include: [
              {
                model: Product,
                where: { seller_id: sellerId },
                required: true,
              },
            ],
          },
          {
            model: User,
            attributes: ['id', 'name', 'email'],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      res.status(200).json({ status: 'success', data: { orders } });
    } catch (err) {
      console.error('Error fetching seller orders:', err);
      next(new AppError('Failed to fetch orders', 500));
    }
  },

  // GET /seller/orders/:id
  getOrderDetails: async (req, res, next) => {
    try {
      const sellerId = req.user.id;
      const orderId = req.params.id;

      const order = await Order.findByPk(orderId, {
        include: [
          {
            model: OrderItem,
            include: [
              {
                model: Product,
                where: { seller_id: sellerId },
                required: true,
              },
            ],
          },
          {
            model: User,
            attributes: ['id', 'name', 'email'],
          },
        ],
      });

      if (!order) return next(new AppError('Order not found or not associated with you', 404));

      res.status(200).json({ status: 'success', data: { order } });
    } catch (err) {
      console.error('Error fetching order details:', err);
      next(new AppError('Failed to fetch order details', 500));
    }
  },

  // PATCH /seller/orders/:id/status
  updateOrderStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return next(new AppError('Invalid status value', 400));
      }

      const sellerId = req.user.id;
      const orderId = req.params.id;

      const order = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, include: [{ model: Product }] }],
      });

      if (!order) return next(new AppError('Order not found', 404));

      const hasSellerProducts = order.OrderItems.some(
        (item) => item.Product && item.Product.seller_id === sellerId
      );

      if (!hasSellerProducts) {
        return next(new AppError('You are not authorized to update this order', 403));
      }

      order.status = status;
      await order.save();

      await sendMail({
        to: order.User.email,
        subject: `Order Status Updated: ${order.status}`,
        html: `<p>Your order #${order.id} is now <strong>${order.status}</strong>.</p>`,
      });


      res.status(200).json({ status: 'success', message: 'Order status updated' });
    } catch (err) {
      console.error('Error updating order status:', err);
      next(new AppError('Failed to update order status', 500));
    }
  },

  // POST /seller/orders/:id/refund
  initiateRefund: async (req, res, next) => {
    try {
      const orderId = req.params.id;
      const sellerId = req.user.id;

      const order = await Order.findByPk(orderId, {
        include: [
          {
            model: OrderItem,
            include: [{ model: Product }],
          },
        ],
      });

      if (!order) return next(new AppError('Order not found', 404));

      const hasSellerProducts = order.OrderItems.some(
        (item) => item.Product && item.Product.seller_id === sellerId
      );

      if (!hasSellerProducts) {
        return next(new AppError('You are not authorized to refund this order', 403));
      }

      // For now, simulate refund request
      res.status(200).json({
        status: 'success',
        message: 'Refund request initiated (simulation)',
      });
    } catch (err) {
      console.error('Error initiating refund:', err);
      next(new AppError('Failed to initiate refund', 500));
    }
  },

  // GET /seller/sales/report
  getSalesReport: async (req, res, next) => {
    try {
      const { period = 'daily' } = req.query;
      const sellerId = req.user.id;

      let groupBy;
      if (period === 'daily') groupBy = 'DATE(created_at)';
      else if (period === 'weekly') groupBy = 'WEEK(created_at)';
      else if (period === 'monthly') groupBy = 'MONTH(created_at)';
      else return next(new AppError('Invalid period format', 400));

      const [results] = await sequelize.query(
        `SELECT ${groupBy} AS period, COUNT(*) AS total_orders, SUM(total_amount) AS revenue
         FROM orders
         WHERE id IN (
           SELECT order_id FROM order_items WHERE product_id IN (
             SELECT id FROM products WHERE seller_id = :sellerId
           )
         )
         GROUP BY period
         ORDER BY period DESC
         LIMIT 30`,
        {
          replacements: { sellerId },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      res.status(200).json({ status: 'success', data: results });
    } catch (err) {
      console.error('Error generating sales report:', err);
      next(new AppError('Failed to generate sales report', 500));
    }
  },

  // GET /seller/transactions
  getTransactionHistory: async (req, res, next) => {
    try {
      const sellerId = req.user.id;

      // Replace with your transaction model/query
      const [results] = await sequelize.query(
        `SELECT * FROM transactions WHERE seller_id = :sellerId ORDER BY created_at DESC LIMIT 100`,
        {
          replacements: { sellerId },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      res.status(200).json({ status: 'success', data: results });
    } catch (err) {
      console.error('Error fetching transactions:', err);
      next(new AppError('Failed to fetch transactions', 500));
    }
  },

  initiateRefund: async (req, res, next) => {
    try {
      const orderId = req.params.id;

      const order = await Order.findByPk(orderId);
      if (!order) return next(new AppError('Order not found', 404));

      if (!order.payment_intent_id) {
        return next(new AppError('No Stripe payment intent associated with this order.', 400));
      }

      const refund = await stripe.refunds.create({
        payment_intent: order.payment_intent_id,
        amount: order.total_amount * 100, // convert to cents
      });

      // Optional: Update order status
      order.status = 'refunded';
      await order.save();

      res.status(200).json({
        status: 'success',
        message: 'Refund initiated successfully',
        data: refund,
      });
    } catch (err) {
      next(new AppError(`Refund failed: ${err.message}`, 500));
    }
  },

  // GET /seller/sales/report?range=monthly&status=paid&start=2024-01-01&end=2024-04-30
  getSalesReport: async (req, res, next) => {
    try {
      const sellerId = req.user.id;
      const {
        range = 'monthly', // daily | weekly | monthly
        status = 'paid',
        start,
        end,
        exportType = null, // csv | excel
      } = req.query;

      const where = {
        seller_id: sellerId,
        payment_status: status,
      };

      if (start && end) {
        where.created_at = {
          [Op.between]: [new Date(start), new Date(end)],
        };
      }

      let dateFormat;
      if (range === 'daily') dateFormat = '%Y-%m-%d';
      else if (range === 'weekly') dateFormat = '%Y-%u';
      else dateFormat = '%Y-%m';

      const results = await Order.findAll({
        where,
        attributes: [
          [fn('DATE_FORMAT', col('created_at'), dateFormat), 'period'],
          [fn('COUNT', '*'), 'orders'],
          [fn('SUM', col('total_price')), 'revenue'],
        ],
        group: [literal('period')],
        order: [[literal('period'), 'ASC']],
        raw: true,
      });

      // Optional export
      if (exportType === 'csv') {
        const parser = new Parser({ fields: ['period', 'orders', 'revenue'] });
        const csv = parser.parse(results);
        res.header('Content-Type', 'text/csv');
        res.attachment('sales_report.csv');
        return res.send(csv);
      }

      res.status(200).json({
        status: 'success',
        range,
        filter: { status, start, end },
        data: results,
      });
    } catch (err) {
      console.error('Error generating sales report:', err);
      next(new AppError('Failed to generate sales report', 500));
    }
  },

  // GET /seller/transactions
  getTransactionHistory: async (req, res, next) => {
    try {
      const sellerId = req.user.id;

      const transactions = await Transaction.findAll({
        where: { seller_id: sellerId },
        order: [['created_at', 'DESC']],
      });

      res.status(200).json({ status: 'success', data: { transactions } });
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      next(new AppError('Failed to fetch transaction history', 500));
    }
  },

  // GET /seller/transactions
  getTransactions: async (req, res, next) => {
    try {
      const sellerId = req.user.id;
      const { startDate, endDate, status, method, exportType } = req.query;

      const filters = {
        seller_id: sellerId,
      };

      if (startDate && endDate) {
        filters.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      if (status) filters.payment_status = status;
      if (method) filters.payment_method = method;

      const transactions = await Order.findAll({
        where: filters,
        order: [['created_at', 'DESC']],
      });

      // Export if requested
      if (exportType === 'csv') {
        const csvData = transactions.map((tx) => ({
          ID: tx.id,
          Amount: tx.total_price,
          Method: tx.payment_method,
          Status: tx.payment_status,
          CreatedAt: tx.created_at,
        }));

        return exportToCSV(res, csvData, 'transactions.csv');
      }

      res.status(200).json({
        status: 'success',
        results: transactions.length,
        data: { transactions },
      });
    } catch (err) {
      next(new AppError('Failed to fetch transactions', 500));
    }
  },
  cancelOrder: async (req, res, next) => {
    try {
      const sellerId = req.user.id;
      const orderId = req.params.id;
      const { reason } = req.body;

      const order = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, include: [Product] }],
      });

      if (!order) return next(new AppError('Order not found', 404));

      const hasSellerProduct = order.OrderItems.some(
        (item) => item.Product && item.Product.seller_id === sellerId
      );
      if (!hasSellerProduct) return next(new AppError('Unauthorized', 403));

      if (order.status === 'cancelled') {
        return next(new AppError('Order already cancelled', 400));
      }

      order.status = 'cancelled';
      order.cancelled_by = 'seller';
      order.cancellation_reason = reason;
      await order.save();

      // TODO: Send cancellation email

      res.status(200).json({ status: 'success', message: 'Order cancelled' });
    } catch (err) {
      next(new AppError('Failed to cancel order', 500));
    }
  },
};

module.exports = sellerOrderController;
