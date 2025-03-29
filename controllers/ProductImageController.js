const { pool } = require('../config/db');
const AppError = require('../utils/appError');

const productImageController = {
  // Add product image
  addProductImage: async (req, res, next) => {
    try {
      const { productId, url, altText, isPrimary } = req.body;
      const productImage = new (require('../models/ProductImageModel'))(pool);

      const imageId = await productImage.create({
        productId,
        url,
        altText,
        isPrimary: isPrimary === 'true',
      });

      res.status(201).json({
        status: 'success',
        data: {
          imageId,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Set image as primary
  setPrimaryImage: async (req, res, next) => {
    try {
      const productImage = new (require('../models/ProductImageModel'))(pool);
      const updatedRows = await productImage.setAsPrimary(req.params.imageId, req.params.productId);

      if (updatedRows === 0) {
        return next(new AppError('No image found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Image set as primary',
      });
    } catch (err) {
      next(err);
    }
  },

  // Update image position
  updateImagePosition: async (req, res, next) => {
    try {
      const { position } = req.body;
      const productImage = new (require('../models/ProductImageModel'))(pool);
      const updatedRows = await productImage.updatePosition(req.params.imageId, position);

      if (updatedRows === 0) {
        return next(new AppError('No image found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Image position updated',
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete product image
  deleteProductImage: async (req, res, next) => {
    try {
      const productImage = new (require('../models/ProductImageModel'))(pool);
      const deletedRows = await productImage.delete(req.params.imageId);

      if (deletedRows === 0) {
        return next(new AppError('No image found with that ID', 404));
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

module.exports = productImageController;
