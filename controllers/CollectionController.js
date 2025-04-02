const Collection = require('../models/CollectionModel');
const { pool } = require('../config/db');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const collectionController = {
  /**
   * @desc    Create a new collection
   * @route   POST /api/collections
   * @access  Private/Admin
   */
  createCollection: async (req, res, next) => {
    try {
      const { name, slug, description, imageUrl, categoryId, startDate, endDate } = req.body;

      // Validate required fields
      if (!name || !slug || !categoryId) {
        logger.warn('Collection creation attempted with missing required fields');
        return next(new AppError('Name, slug, and category ID are required', 400));
      }

      const collection = new Collection(pool);
      const collectionId = await collection.create({
        name,
        slug,
        description,
        imageUrl,
        categoryId,
        startDate,
        endDate,
      });

      logger.info(`Collection created with ID: ${collectionId}`);

      res.status(201).json({
        status: 'success',
        message: 'Collection created successfully',
        data: {
          collectionId,
        },
      });
    } catch (err) {
      logger.error(`Collection creation error: ${err.message}`);
      if (err.message.includes('already exists')) {
        return next(new AppError(err.message, 409)); // Conflict
      }
      next(new AppError('Failed to create collection', 500));
    }
  },

  /**
   * @desc    Get all collections
   * @route   GET /api/collections
   * @access  Public
   */
  getAllCollections: async (req, res, next) => {
    try {
      const { active } = req.query;
      const collection = new Collection(pool);

      const collections = await collection.findAll(active === 'true');

      res.status(200).json({
        status: 'success',
        message:
          collections.length > 0 ? 'Collections retrieved successfully' : 'No collections found',
        results: collections.length,
        data: {
          collections,
        },
      });
    } catch (err) {
      logger.error(`Error getting collections: ${err.message}`);
      next(new AppError('Failed to retrieve collections', 500));
    }
  },

  /**
   * @desc    Get collections by category
   * @route   GET /api/collections/category/:categoryId
   * @access  Public
   */
  getCollectionsByCategory: async (req, res, next) => {
    try {
      const { active } = req.query;
      const categoryId = parseInt(req.params.categoryId);

      if (!categoryId || isNaN(categoryId)) {
        logger.warn('Invalid category ID provided');
        return next(new AppError('Valid category ID is required', 400));
      }

      const collection = new Collection(pool);
      const collections = await collection.findByCategory(categoryId, {
        activeOnly: active !== 'false',
      });

      res.status(200).json({
        status: 'success',
        message:
          collections.length > 0
            ? 'Collections retrieved successfully'
            : 'No collections found for this category',
        results: collections.length,
        data: {
          collections,
        },
      });
    } catch (err) {
      logger.error(`Error getting collections by category: ${err.message}`);
      next(new AppError('Failed to retrieve collections by category', 500));
    }
  },

  /**
   * @desc    Add products to a collection
   * @route   POST /api/collections/:id/add-products
   * @access  Private/Admin
   */
  addProductsToCollection: async (req, res, next) => {
    try {
      const collectionId = parseInt(req.params.id);
      const { productIds } = req.body;

      if (!collectionId || isNaN(collectionId)) {
        return next(new AppError('Valid collection ID is required', 400));
      }

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return next(new AppError('Array of product IDs is required', 400));
      }

      const collection = new Collection(pool);
      const addedCount = await collection.addProducts(collectionId, productIds);

      res.status(200).json({
        status: 'success',
        message: `Successfully added ${addedCount} products to collection`,
        data: { addedCount },
      });
    } catch (err) {
      if (err.message.includes('already exist')) {
        return next(new AppError(err.message, 409));
      }
      if (err.message.includes('not found')) {
        return next(new AppError(err.message, 404));
      }
      next(new AppError('Failed to add products to collection', 500));
    }
  },

  /**
   * @desc    Get a single collection
   * @route   GET /api/collections/:id
   * @access  Public
   */
  getCollection: async (req, res, next) => {
    try {
      const { withProducts } = req.query;
      const collectionId = parseInt(req.params.id);

      if (!collectionId || isNaN(collectionId)) {
        logger.warn('Invalid collection ID provided');
        return next(new AppError('Valid collection ID is required', 400));
      }

      const collection = new Collection(pool);
      const collectionData = await collection.findById(collectionId, withProducts === 'true');

      if (!collectionData) {
        logger.warn(`Collection not found with ID: ${collectionId}`);
        return next(new AppError('No collection found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Collection retrieved successfully',
        data: {
          collection: collectionData,
        },
      });
    } catch (err) {
      logger.error(`Error getting collection ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to retrieve collection', 500));
    }
  },

  /**
   * @desc    Update a collection
   * @route   PATCH /api/collections/:id
   * @access  Private/Admin
   */
  updateCollection: async (req, res, next) => {
    try {
      const collectionId = parseInt(req.params.id);
      const updates = req.body;

      if (!collectionId || isNaN(collectionId)) {
        logger.warn('Invalid collection ID provided for update');
        return next(new AppError('Valid collection ID is required', 400));
      }

      if (Object.keys(updates).length === 0) {
        logger.warn('Update attempted with no fields to update');
        return next(new AppError('At least one field to update is required', 400));
      }

      const collection = new Collection(pool);
      const updatedRows = await collection.update(collectionId, updates);

      if (updatedRows === 0) {
        logger.warn(`Update failed - collection not found with ID: ${collectionId}`);
        return next(new AppError('No collection found with that ID', 404));
      }

      logger.info(`Collection updated with ID: ${collectionId}`);
      res.status(200).json({
        status: 'success',
        message: 'Collection updated successfully',
        data: null,
      });
    } catch (err) {
      logger.error(`Error updating collection ${req.params.id}: ${err.message}`);
      if (err.message.includes('already exists')) {
        return next(new AppError(err.message, 409));
      }
      next(new AppError('Failed to update collection', 500));
    }
  },

  /**
   * @desc    Delete a collection
   * @route   DELETE /api/collections/:id
   * @access  Private/Admin
   */
  deleteCollection: async (req, res, next) => {
    try {
      const collectionId = parseInt(req.params.id);

      if (!collectionId || isNaN(collectionId)) {
        logger.warn('Invalid collection ID provided for deletion');
        return next(new AppError('Valid collection ID is required', 400));
      }

      const collection = new Collection(pool);
      const deletedRows = await collection.delete(collectionId);

      if (deletedRows === 0) {
        logger.warn(`Delete failed - collection not found with ID: ${collectionId}`);
        return next(new AppError('No collection found with that ID', 404));
      }

      logger.info(`Collection deleted with ID: ${collectionId}`);
      res.status(204).json({
        status: 'success',
        message: 'Collection deleted successfully',
        data: null,
      });
    } catch (err) {
      logger.error(`Error deleting collection ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to delete collection', 500));
    }
  },

  /**
   * @desc    Get products in a collection
   * @route   GET /api/collections/:id/products
   * @access  Public
   */
  getCollectionProducts: async (req, res, next) => {
    try {
      const collectionId = parseInt(req.params.id);

      if (!collectionId || isNaN(collectionId)) {
        logger.warn('Invalid collection ID provided for products');
        return next(new AppError('Valid collection ID is required', 400));
      }

      const collection = new Collection(pool);

      // Verify collection exists first
      const collectionExists = await collection.findById(collectionId);
      if (!collectionExists) {
        logger.warn(`Products requested for non-existent collection ID: ${collectionId}`);
        return next(new AppError('No collection found with that ID', 404));
      }

      const products = await collection.getCollectionProducts(collectionId);

      res.status(200).json({
        status: 'success',
        message:
          products.length > 0
            ? 'Products retrieved successfully'
            : 'No products found in this collection',
        results: products.length,
        data: {
          products,
        },
      });
    } catch (err) {
      logger.error(`Error getting products for collection ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to retrieve collection products', 500));
    }
  },

  // Add these methods to your controller:

  /**
   * @desc    Bulk create collections
   * @route   POST /api/collections/bulk
   * @access  Private/Admin
   */
  bulkCreateCollections: async (req, res, next) => {
    try {
      // Validate input
      if (!Array.isArray(req.body) || req.body.length === 0) {
        return next(new AppError('Request body must be a non-empty array', 400));
      }

      // Validate each collection
      for (const collection of req.body) {
        if (!collection.name || !collection.slug || !collection.categoryId) {
          return next(new AppError('Each collection must have name, slug, and categoryId', 400));
        }
      }

      const collection = new Collection(pool);
      const collectionIds = await collection.bulkCreate(req.body);

      res.status(201).json({
        status: 'success',
        message: `${collectionIds.length} collections created successfully`,
        data: { collectionIds },
      });
    } catch (err) {
      logger.error(`Bulk create error: ${err.message}`);

      if (err.code === 'ER_DUP_ENTRY') {
        return next(new AppError('Duplicate slug detected in bulk create', 409));
      }
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return next(new AppError('Invalid categoryId specified', 400));
      }

      next(new AppError('Failed to create collections', 500));
    }
  },
  /**
   * @desc    Bulk update collections
   * @route   PATCH /api/collections/bulk
   * @access  Private/Admin
   */
  bulkUpdateCollections: async (req, res, next) => {
    try {
      const collection = new Collection(pool);
      const updatedCount = await collection.bulkUpdate(req.body);

      res.status(200).json({
        status: 'success',
        message: `${updatedCount} collections updated`,
        data: { updatedCount },
      });
    } catch (err) {
      next(new AppError('Failed to bulk update collections', 500));
    }
  },

  /**
   * @desc    Toggle featured status
   * @route   PATCH /api/collections/:id/feature
   * @access  Private/Admin
   */
  toggleFeaturedStatus: async (req, res, next) => {
    try {
      const collection = new Collection(pool);
      const updated = await collection.toggleFeatured(req.params.id);

      res.status(200).json({
        status: 'success',
        message: `Collection ${updated.is_featured ? 'featured' : 'unfeatured'}`,
        data: { collection: updated },
      });
    } catch (err) {
      next(new AppError('Failed to toggle featured status', 500));
    }
  },

  /**
   * @desc    Update collection status
   * @route   PATCH /api/collections/:id/status
   * @access  Private/Admin
   */
  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!['active', 'inactive'].includes(status)) {
        return next(new AppError('Invalid status value', 400));
      }

      const collection = new Collection(pool);
      const updated = await collection.update(req.params.id, { status });

      res.status(200).json({
        status: 'success',
        message: `Collection marked as ${status}`,
        data: { updated },
      });
    } catch (err) {
      next(new AppError('Failed to update collection status', 500));
    }
  },

  /**
   * @desc    Get collection analytics
   * @route   GET /api/collections/:id/analytics
   * @access  Public
   */
  getCollectionAnalytics: async (req, res, next) => {
    try {
      const collection = new Collection(pool);
      const analytics = await collection.getCollectionAnalytics(req.params.id);

      res.status(200).json({
        status: 'success',
        data: { analytics },
      });
    } catch (err) {
      next(new AppError('Failed to get collection analytics', 500));
    }
  },

  /**
   * @desc    Get top collections
   * @route   GET /api/collections/analytics/top
   * @access  Public
   */
  getTopCollections: async (req, res, next) => {
    try {
      const { limit = 10 } = req.query;
      const collection = new Collection(pool);
      const collections = await collection.getTopCollections(parseInt(limit));

      res.status(200).json({
        status: 'success',
        results: collections.length,
        data: { collections },
      });
    } catch (err) {
      next(new AppError('Failed to get top collections', 500));
    }
  },

  /**
   * @desc    Get trending collections
   * @route   GET /api/collections/trending
   * @access  Public
   */
  getTrendingCollections: async (req, res, next) => {
    try {
      const { limit = 5 } = req.query;
      const collection = new Collection(pool);
      const collections = await collection.getTrendingCollections(parseInt(limit));

      res.status(200).json({
        status: 'success',
        results: collections.length,
        data: { collections },
      });
    } catch (err) {
      next(new AppError('Failed to get trending collections', 500));
    }
  },

  /**
   * @desc    Get new collections
   * @route   GET /api/collections/new
   * @access  Public
   */
  getNewCollections: async (req, res, next) => {
    try {
      const { limit = 5 } = req.query;
      const collection = new Collection(pool);
      const collections = await collection.getNewCollections(parseInt(limit));

      res.status(200).json({
        status: 'success',
        results: collections.length,
        data: { collections },
      });
    } catch (err) {
      next(new AppError('Failed to get new collections', 500));
    }
  },

  /**
   * @desc    Get ending soon collections
   * @route   GET /api/collections/ending-soon
   * @access  Public
   */
  getEndingSoonCollections: async (req, res, next) => {
    try {
      const { limit = 5 } = req.query;
      const collection = new Collection(pool);
      const collections = await collection.getEndingSoonCollections(parseInt(limit));

      res.status(200).json({
        status: 'success',
        results: collections.length,
        data: { collections },
      });
    } catch (err) {
      next(new AppError('Failed to get ending soon collections', 500));
    }
  },

  /**
   * @desc    Remove products from collection
   * @route   DELETE /api/collections/:id/products/batch
   * @access  Private/Admin
   */
  removeProductsFromCollection: async (req, res, next) => {
    try {
      const { productIds } = req.body;
      const collection = new Collection(pool);
      const removedCount = await collection.removeProductsFromCollection(req.params.id, productIds);

      res.status(200).json({
        status: 'success',
        message: `${removedCount} products removed from collection`,
        data: { removedCount },
      });
    } catch (err) {
      next(new AppError('Failed to remove products from collection', 500));
    }
  },

  /**
   * @desc    Replace all products in collection
   * @route   PUT /api/collections/:id/products
   * @access  Private/Admin
   */
  replaceCollectionProducts: async (req, res, next) => {
    try {
      const { productIds } = req.body;
      const collection = new Collection(pool);
      const addedCount = await collection.replaceCollectionProducts(req.params.id, productIds);

      res.status(200).json({
        status: 'success',
        message: `Replaced collection with ${addedCount} products`,
        data: { addedCount },
      });
    } catch (err) {
      next(new AppError('Failed to replace collection products', 500));
    }
  },

  /**
   * @desc    Update product positions
   * @route   PATCH /api/collections/:id/products/positions
   * @access  Private/Admin
   */
  updateProductPositions: async (req, res, next) => {
    try {
      const { positions } = req.body; // Array of {productId, position}
      const collection = new Collection(pool);
      await collection.updateProductPositions(req.params.id, positions);

      res.status(200).json({
        status: 'success',
        message: 'Product positions updated',
      });
    } catch (err) {
      next(new AppError('Failed to update product positions', 500));
    }
  },
};

module.exports = collectionController;
