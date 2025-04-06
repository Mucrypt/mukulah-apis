
// backend/controllers/sellersController.js

const Seller = require('../models/entities/Seller');

const Product = require('../models/ProductModel');
const { pool } = require('../config/db');
const AppError = require('../utils/appError');

exports.getAllSellers = async (req, res) => {
  try {
    const sellers = await Seller.findAll();
    res.status(200).json(sellers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSellerById = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.params.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.status(200).json(seller);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSeller = async (req, res) => {
  try {
    const seller = await Seller.create(req.body);
    res.status(201).json(seller);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateSeller = async (req, res) => {
  try {
    // Only allow seller to update their own profile or admin to update any
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'superAdmin' &&
      req.user.id !== req.params.id
    ) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    const seller = await Seller.findByPk(req.params.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    await seller.update(req.body);
    res.status(200).json(seller);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteSeller = async (req, res) => {
  try {
    // Only allow admin to delete sellers or seller to delete themselves
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'superAdmin' &&
      req.user.id !== req.params.id
    ) {
      return res.status(403).json({ message: 'Unauthorized to delete this seller' });
    }

    const seller = await Seller.findByPk(req.params.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    await seller.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all products for a specific seller
exports.getSellerProducts = async (req, res, next) => {
  try {
    const sellerId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Verify the authenticated user is the seller or an admin
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.id !== sellerId) {
      return next(new AppError('You can only view your own products', 403));
    }

    const productModel = new Product(pool);
    const products = await productModel.search({
      sellerId: parseInt(sellerId),
      page,
      limit,
    });

    res.status(200).json({
      status: 'success',
      results: products.products.length,
      total: products.total,
      page,
      pages: Math.ceil(products.total / limit),
      data: {
        products: products.products,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a product for a seller
exports.createProduct = async (req, res, next) => {
  try {
    const sellerId = req.params.id;

    // Verify the authenticated user is the seller or an admin
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.id !== sellerId) {
      return next(new AppError('You can only create products for your own account', 403));
    }

    const productData = {
      ...req.body,
      sellerId: sellerId, // Associate product with seller
      status: 'draft', // Default to draft status for seller-created products
    };

    const productModel = new Product(pool);
    const productId = await productModel.create(productData);

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      productId,
    });
  } catch (error) {
    next(error);
  }
};

// Update a seller's product
exports.updateSellerProduct = async (req, res, next) => {
  try {
    const { id: sellerId, productId } = req.params;

    // Verify the authenticated user is the seller or an admin
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.id !== sellerId) {
      return next(new AppError('You can only update your own products', 403));
    }

    const productModel = new Product(pool);

    // First verify the product belongs to this seller
    const product = await productModel.findById(productId);
    if (!product || product.seller_id !== parseInt(sellerId)) {
      return next(new AppError('Product not found or does not belong to you', 404));
    }

    const updatedRows = await productModel.update(productId, req.body);

    if (updatedRows === 0) {
      return next(new AppError('Product not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete a seller's product
exports.deleteSellerProduct = async (req, res, next) => {
  try {
    const { id: sellerId, productId } = req.params;

    // Verify the authenticated user is the seller or an admin
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.id !== sellerId) {
      return next(new AppError('You can only delete your own products', 403));
    }

    const productModel = new Product(pool);

    // First verify the product belongs to this seller
    const product = await productModel.findById(productId);
    if (!product || product.seller_id !== parseInt(sellerId)) {
      return next(new AppError('Product not found or does not belong to you', 404));
    }

    const deletedRows = await productModel.delete(productId);

    if (deletedRows === 0) {
      return next(new AppError('Product not found', 404));
    }

    res.status(204).json({
      status: 'success',
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }

  // In sellersController.js
  exports.approveSeller = async (req, res, next) => {
    try {
      // Only admin can approve sellers
      if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
        return next(new AppError('Only admins can approve sellers', 403));
      }

      const seller = await Seller.findByPk(req.params.id);
      if (!seller) return next(new AppError('Seller not found', 404));

      await seller.update({ status: 'approved' });

      // Send approval email (implement this in your email service)
      // await sendSellerApprovalEmail(seller);

      res.status(200).json({
        status: 'success',
        message: 'Seller approved successfully',
        data: { seller },
      });
    } catch (error) {
      next(error);
    }
  };
};
