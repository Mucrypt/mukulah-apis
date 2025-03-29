const { pool } = require('../config/db');
const AppError = require('../utils/appError');

const productVariationController = {
  // Create product variation
  createVariation: async (req, res, next) => {
    try {
      const { sku, price, discountPrice, stockQuantity, imageId, isDefault, attributes } = req.body;
      const productVariation = new (require('../models/ProductVariationModel'))(pool);

      const variationId = await productVariation.create({
        productId: req.params.productId,
        sku,
        price,
        discountPrice,
        stockQuantity,
        imageId,
        isDefault,
        attributes,
      });

      res.status(201).json({
        status: 'success',
        data: {
          variationId,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Set variation as default
  setDefaultVariation: async (req, res, next) => {
    try {
      const productVariation = new (require('../models/ProductVariationModel'))(pool);
      const updatedRows = await productVariation.setAsDefault(
        req.params.variationId,
        req.params.productId
      );

      if (updatedRows === 0) {
        return next(new AppError('No variation found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Variation set as default',
      });
    } catch (err) {
      next(err);
    }
  },

  // Update variation
  updateVariation: async (req, res, next) => {
    try {
      const productVariation = new (require('../models/ProductVariationModel'))(pool);
      const updatedRows = await productVariation.update(req.params.variationId, req.body);

      if (updatedRows === 0) {
        return next(new AppError('No variation found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Variation updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // Update variation stock
  updateVariationStock: async (req, res, next) => {
    try {
      const { quantity } = req.body;
      const productVariation = new (require('../models/ProductVariationModel'))(pool);
      const updatedRows = await productVariation.updateStock(req.params.variationId, quantity);

      if (updatedRows === 0) {
        return next(new AppError('No variation found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Variation stock updated',
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete variation
  deleteVariation: async (req, res, next) => {
    try {
      const productVariation = new (require('../models/ProductVariationModel'))(pool);
      const deletedRows = await productVariation.delete(req.params.variationId);

      if (deletedRows === 0) {
        return next(new AppError('No variation found with that ID', 404));
      }

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = productVariationController;
