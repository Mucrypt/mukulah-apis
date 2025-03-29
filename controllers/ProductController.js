const Product = require('../models/ProductModel');
const { pool } = require('../config/db');
const AppError = require('../utils/appError');

const productController = {
  // Create a new product
  createProduct: async (req, res, next) => {
    try {
      const product = new Product(pool);
      const productId = await product.create(req.body);

      res.status(201).json({
        status: 'success',
        data: {
          productId,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get all products
  getAllProducts: async (req, res, next) => {
    try {
      const product = new Product(pool);

      // Get query parameters
      const {
        query,
        category,
        collection,
        brand,
        minPrice,
        maxPrice,
        attributes,
        sort,
        page = 1,
        limit = 20,
      } = req.query;

      // Parse attributes if provided
      let parsedAttributes;
      if (attributes) {
        try {
          parsedAttributes = JSON.parse(attributes);
        } catch (e) {
          return next(new AppError('Invalid attributes format', 400));
        }
      }

      // Parse sort if provided
      let sortBy, sortOrder;
      if (sort) {
        const sortParts = sort.split(':');
        sortBy = sortParts[0];
        sortOrder = sortParts[1] || 'DESC';
      }

      const searchResults = await product.search({
        query,
        categoryId: category,
        collectionId: collection,
        brandId: brand,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        attributes: parsedAttributes,
        sortBy,
        sortOrder,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.status(200).json({
        status: 'success',
        results: searchResults.products.length,
        total: searchResults.total,
        page: searchResults.page,
        pages: Math.ceil(searchResults.total / searchResults.limit),
        data: {
          products: searchResults.products,
        },
      });
    } catch (err) {
      next(err);
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
      const productData = await product.findById(req.params.id, {
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
      next(err);
    }
  },

  // Update a product
  updateProduct: async (req, res, next) => {
    try {
      const product = new Product(pool);
      const updatedRows = await product.update(req.params.id, req.body);

      if (updatedRows === 0) {
        return next(new AppError('No product found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Product updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete a product
  deleteProduct: async (req, res, next) => {
    try {
      const product = new Product(pool);
      const deletedRows = await product.delete(req.params.id);

      if (deletedRows === 0) {
        return next(new AppError('No product found with that ID', 404));
      }

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },

  // Increment product views
  incrementProductViews: async (req, res, next) => {
    try {
      const product = new Product(pool);
      await product.incrementViews(req.params.id);

      res.status(200).json({
        status: 'success',
        message: 'Product views incremented',
      });
    } catch (err) {
      next(err);
    }
  },

  // Get related products
  getRelatedProducts: async (req, res, next) => {
    try {
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);
      const products = await productRelationship.getRelatedProducts(req.params.id, {
        limit: req.query.limit || 5,
      });

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get cross-sell products
  getCrossSellProducts: async (req, res, next) => {
    try {
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);
      const products = await productRelationship.getCrossSellProducts(req.params.id, {
        limit: req.query.limit || 5,
      });

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get up-sell products
  getUpSellProducts: async (req, res, next) => {
    try {
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);
      const products = await productRelationship.getUpSellProducts(req.params.id, {
        limit: req.query.limit || 5,
      });

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = productController;
