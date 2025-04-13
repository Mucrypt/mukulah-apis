// backend/controllers/sellerInventoryController.js

const Product = require('../../models/entities/Product');
const AppError = require('../../utils/appError');
const { Op } = require('sequelize');

// In-memory stock history for demonstration. Replace with DB in production.
const stockHistory = [];

exports.adjustStock = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || isNaN(quantity)) {
      return next(new AppError('Please provide a valid stock quantity', 400));
    }

    const product = await Product.findOne({ where: { id, seller_id: sellerId } });
    if (!product) return next(new AppError('Product not found or not authorized', 404));

    // Save adjustment in mock history
    stockHistory.push({
      product_id: product.id,
      seller_id: sellerId,
      previous_quantity: product.stock_quantity,
      new_quantity: quantity,
      changed_at: new Date(),
      type: 'manual',
    });

    product.stock_quantity = quantity;
    product.stock_status = quantity > 0 ? 'in_stock' : 'out_of_stock';
    await product.save();

    res.status(200).json({
      status: 'success',
      message: 'Stock updated successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

exports.getInventoryOverview = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const products = await Product.findAll({ where: { seller_id: sellerId } });

    const total = products.length;
    const inStock = products.filter((p) => p.stock_quantity > 0).length;
    const outOfStock = products.filter((p) => p.stock_quantity === 0).length;
    const lowStock = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 5).length;

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          total_products: total,
          in_stock: inStock,
          out_of_stock: outOfStock,
          low_stock: lowStock,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getStockAdjustmentHistory = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const history = stockHistory.filter((entry) => entry.seller_id === sellerId);

    res.status(200).json({
      status: 'success',
      results: history.length,
      data: { history },
    });
  } catch (error) {
    next(error);
  }
};
