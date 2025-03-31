const { pool } = require('../config/db');
const AppError = require('../utils/appError');

const productImageController = {
  // Add product images
  addProductImage: async (req, res, next) => {
    try {
      const images = req.body.images; // Expecting an array of images
      if (!Array.isArray(images) || images.length === 0) {
        return next(new AppError('No images provided', 400));
      }

      const productImage = new (require('../models/ProductImageModel'))(pool);
      const imageIds = [];

      for (const image of images) {
        const { productId, url, altText, isPrimary } = image;

        // If this image is marked as primary, reset other primary images for the product
        if (isPrimary === true || isPrimary === 'true') {
          await pool.execute('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', [
            productId,
          ]);
        }

        const imageId = await productImage.create({
          productId,
          url,
          altText,
          isPrimary: isPrimary === true || isPrimary === 'true',
        });
        imageIds.push(imageId);
      }

      res.status(201).json({
        status: 'success',
        message: 'Images added successfully',
        data: {
          imageIds,
        },
      });
    } catch (err) {
      console.error('Error adding product images:', err);
      next(new AppError('Failed to add product images', 500));
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
        message: 'Image set as primary successfully',
      });
    } catch (err) {
      console.error('Error setting primary image:', err);
      next(new AppError('Failed to set image as primary', 500));
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
        message: 'Image position updated successfully',
      });
    } catch (err) {
      console.error('Error updating image position:', err);
      next(new AppError('Failed to update image position', 500));
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

      res.status(200).json({
        status: 'success',
        message: 'Image deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting product image:', err);
      next(new AppError('Failed to delete product image', 500));
    }
  },

  // Get product images
  getProductImages: async (req, res, next) => {
    try {
      const { productId } = req.query;
      const productImage = new (require('../models/ProductImageModel'))(pool);

      const images = await productImage.findByProductId(productId);

      res.status(200).json({
        status: 'success',
        message: 'Product images retrieved successfully',
        data: images,
      });
    } catch (err) {
      console.error('Error retrieving product images:', err);
      next(new AppError('Failed to retrieve product images', 500));
    }
  },
};

module.exports = productImageController;
