const { pool } = require('../config/db');
const AppError = require('../utils/appError');

const productRelationshipController = {
  // Add related products
  addRelatedProducts: async (req, res, next) => {
    try {
      const { productIds } = req.body;
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);

      const addedCount = await productRelationship.addRelatedProducts(
        parseInt(req.params.productId, 10), // Ensure productId is an integer
        productIds
      );

      // Ensure the limit is valid and matches the number of product IDs
      const limit =
        Number.isInteger(productIds.length) && productIds.length > 0 ? productIds.length : 5;

      // Fetch the details of the related products
      const relatedProducts = await productRelationship.getRelatedProducts(
        parseInt(req.params.productId, 10), // Ensure productId is an integer
        { limit }
      );

      res.status(200).json({
        status: 'success',
        data: {
          addedCount,
          relatedProducts, // Include the related product details in the response
        },
      });
    } catch (err) {
      console.error('Error adding related products:', err);
      next(err);
    }
  },

  // Add cross-sell products
  addCrossSellProducts: async (req, res, next) => {
    try {
      const { productIds } = req.body;
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);

      const addedCount = await productRelationship.addCrossSellProducts(
        req.params.productId,
        productIds
      );

      res.status(200).json({
        status: 'success',
        data: {
          addedCount,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Add up-sell products
  addUpSellProducts: async (req, res, next) => {
    try {
      const { productIds } = req.body;
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);

      const addedCount = await productRelationship.addUpSellProducts(
        req.params.productId,
        productIds
      );

      res.status(200).json({
        status: 'success',
        data: {
          addedCount,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Remove related products
  removeRelatedProducts: async (req, res, next) => {
    try {
      const { productIds } = req.body;
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);

      const removedCount = await productRelationship.removeRelatedProducts(
        req.params.productId,
        productIds
      );

      res.status(200).json({
        status: 'success',
        data: {
          removedCount,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Remove cross-sell products
  removeCrossSellProducts: async (req, res, next) => {
    try {
      const { productIds } = req.body;
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);

      const removedCount = await productRelationship.removeCrossSellProducts(
        req.params.productId,
        productIds
      );

      res.status(200).json({
        status: 'success',
        data: {
          removedCount,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Remove up-sell products
  removeUpSellProducts: async (req, res, next) => {
    try {
      const { productIds } = req.body;
      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);

      const removedCount = await productRelationship.removeUpSellProducts(
        req.params.productId,
        productIds
      );

      res.status(200).json({
        status: 'success',
        data: {
          removedCount,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Update relationship positions
  updateRelationshipPositions: async (req, res, next) => {
    try {
      const { positions } = req.body;
      const { relationshipType } = req.params;

      if (!['related', 'cross_sell', 'up_sell'].includes(relationshipType)) {
        return next(new AppError('Invalid relationship type', 400));
      }

      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);
      await productRelationship.updatePositions(req.params.productId, relationshipType, positions);

      res.status(200).json({
        status: 'success',
        message: 'Positions updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = productRelationshipController;
// This code is a controller for managing product relationships in an e-commerce application. It provides methods to add, remove, and update relationships between products, such as related products, cross-sell products, and up-sell products. The controller interacts with the database through a model class (ProductRelationshipModel) and handles errors gracefully using middleware (AppError).
