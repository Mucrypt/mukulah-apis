const Product = require('../models/ProductModel');
const { pool } = require('../config/db');
const AppError = require('../utils/appError');
const { withTransaction } = require('../utils/dbUtils'); // Import withTransaction

const productController = {
  // Create a new product
  createProduct: async (req, res, next) => {
    try {
      const requiredFields = ['name', 'slug', 'description', 'price', 'sku'];
      const missingFields = requiredFields.filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400));
      }

      const product = new Product(pool);
      const productId = await withTransaction(async (connection) => {
        // Add created_by to product data
        const productData = {
          ...req.body,
          created_by: req.user.id,
          updated_by: req.user.id,
        };

        const productId = await product.create(productData, connection);

        // Log the product creation
        await connection.execute(
          'INSERT INTO admin_logs (user_id, action, details) VALUES (?, ?, ?)',
          [req.user.id, 'product_create', `Created product ${productId}`]
        );

        return productId;
      });

      res.status(201).json({
        status: 'success',
        data: { productId },
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return next(new AppError('Product with this SKU or slug already exists', 400));
      }
      console.error('Product creation error:', err);
      next(new AppError('Failed to create product', 500));
    }
  },
  // Get all products
  getAllProducts: async (req, res, next) => {
    try {
      const product = new Product(pool);

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      let sortBy, sortOrder;
      if (req.query.sort) {
        const [field, order] = req.query.sort.split(':');
        sortBy = field;
        sortOrder = order || 'DESC';
      }

      const searchResults = await product.search({
        query: req.query.query || undefined,
        categoryId: req.query.category_id ? parseInt(req.query.category_id) : undefined,
        collectionId: req.query.collection_id ? parseInt(req.query.collection_id) : undefined,
        brandId: req.query.brand_id ? parseInt(req.query.brand_id) : undefined,
        minPrice: req.query.min_price ? parseFloat(req.query.min_price) : undefined,
        maxPrice: req.query.max_price ? parseFloat(req.query.max_price) : undefined,
        sortBy,
        sortOrder,
        limit,
        offset,
      });

      res.status(200).json({
        status: 'success',
        results: searchResults.products.length,
        total: searchResults.total,
        page,
        pages: Math.ceil(searchResults.total / limit),
        data: {
          products: searchResults.products,
        },
      });
    } catch (err) {
      console.error('Error getting products:', err);
      next(new AppError('Failed to retrieve products', 500));
    }
  },

  // Get a single product
  getProduct: async (req, res, next) => {
    try {
      const {
        withImages,
        withCategories,
        withCollections,
        withAttributes,
        withVariations,
        withReviews,
      } = req.query;

      const product = new Product(pool);
      const productData = await product.findById(parseInt(req.params.id), {
        withImages: withImages === 'true',
        withCategories: withCategories === 'true',
        withCollections: withCollections === 'true',
        withAttributes: withAttributes === 'true',
        withVariations: withVariations === 'true',
        withReviews: withReviews === 'true',
      });

      if (!productData) {
        return next(new AppError('No product found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          product: productData,
        },
      });
    } catch (err) {
      console.error('Error getting product:', err);
      next(new AppError('Failed to retrieve product', 500));
    }
  },

  // Update a product
  updateProduct: async (req, res, next) => {
    try {
      if (Object.keys(req.body).length === 0) {
        return next(new AppError('No update data provided', 400));
      }

      const product = new Product(pool);
      const updatedRows = await product.update(parseInt(req.params.id), req.body);

      if (updatedRows === 0) {
        return next(new AppError('No product found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Product updated successfully',
        data: {
          affectedRows: updatedRows,
        },
      });
    } catch (err) {
      console.error('Error updating product:', err);
      next(new AppError('Failed to update product', 500));
    }
  },

  // Delete a product
  deleteProduct: async (req, res, next) => {
    try {
      const product = new Product(pool);
      const deletedRows = await product.delete(parseInt(req.params.id));

      if (deletedRows === 0) {
        return next(new AppError('No product found with that ID', 404));
      }

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (err) {
      console.error('Error deleting product:', err);
      next(new AppError('Failed to delete product', 500));
    }
  },

  // Increment product views
  incrementProductViews: async (req, res, next) => {
    try {
      const product = new Product(pool);
      await product.incrementViews(parseInt(req.params.id));

      res.status(200).json({
        status: 'success',
        message: 'Product views incremented',
      });
    } catch (err) {
      console.error('Error incrementing product views:', err);
      next(new AppError('Failed to increment product views', 500));
    }
  },

  // Get related products
  getRelatedProducts: async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);
      const products = await productRelationship.getRelatedProducts(parseInt(req.params.id), {
        limit,
      });

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products,
        },
      });
    } catch (err) {
      console.error('Error getting related products:', err);
      next(new AppError('Failed to get related products', 500));
    }
  },

  // Get cross-sell products
  getCrossSellProducts: async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);
      const products = await productRelationship.getCrossSellProducts(parseInt(req.params.id), {
        limit,
      });

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products,
        },
      });
    } catch (err) {
      console.error('Error getting cross-sell products:', err);
      next(new AppError('Failed to get cross-sell products', 500));
    }
  },

  // Get up-sell products
  getUpSellProducts: async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);
      const products = await productRelationship.getUpSellProducts(parseInt(req.params.id), {
        limit,
      });

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products,
        },
      });
    } catch (err) {
      console.error('Error getting up-sell products:', err);
      next(new AppError('Failed to get up-sell products', 500));
    }
  },
};

module.exports = productController;
