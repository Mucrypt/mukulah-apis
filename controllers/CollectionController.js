const Collection = require('../models/CollectionModel');
const { pool } = require('../config/db');
const AppError = require('../utils/appError');

const collectionController = {
  // Create a new collection
  createCollection: async (req, res, next) => {
    try {
      const { name, slug, description, imageUrl, categoryId, startDate, endDate } = req.body;

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

      res.status(201).json({
        status: 'success',
        data: {
          collectionId,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get all collections
  getAllCollections: async (req, res, next) => {
    try {
      const { active } = req.query;
      const collection = new Collection(pool);

      let collections;
      if (active === 'true') {
        collections = await collection.getActiveCollections();
      } else {
        collections = await collection.findAll();
      }

      res.status(200).json({
        status: 'success',
        results: collections.length,
        data: {
          collections,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get collections by category
  getCollectionsByCategory: async (req, res, next) => {
    try {
      const { active } = req.query;
      const collection = new Collection(pool);
      const collections = await collection.findByCategory(req.params.categoryId, {
        activeOnly: active !== 'false',
      });

      res.status(200).json({
        status: 'success',
        results: collections.length,
        data: {
          collections,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get a single collection
  getCollection: async (req, res, next) => {
    try {
      const { withProducts } = req.query;
      const collection = new Collection(pool);
      const collectionData = await collection.findById(req.params.id, withProducts === 'true');

      if (!collectionData) {
        return next(new AppError('No collection found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          collection: collectionData,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Update a collection
  updateCollection: async (req, res, next) => {
    try {
      const collection = new Collection(pool);
      const updatedRows = await collection.update(req.params.id, req.body);

      if (updatedRows === 0) {
        return next(new AppError('No collection found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Collection updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete a collection
  deleteCollection: async (req, res, next) => {
    try {
      const collection = new Collection(pool);
      const deletedRows = await collection.delete(req.params.id);

      if (deletedRows === 0) {
        return next(new AppError('No collection found with that ID', 404));
      }

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },

  // Get collection products
  getCollectionProducts: async (req, res, next) => {
    try {
      const collection = new Collection(pool);
      const products = await collection.getCollectionProducts(req.params.id);

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

module.exports = collectionController;
