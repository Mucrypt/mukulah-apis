const ProductImage = require('../models/entities/ProductImage');
const { AppError } = require('../utils/appError');
const { Op } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadToCloudinary = async (file, folder = 'products') => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    await fs.unlink(file.path);
    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    await fs.unlink(file.path).catch(() => {});
    throw new AppError('Cloudinary upload failed', 500);
  }
};

const productImageController = {
  /**
   * Admin uploads product images
   */
  uploadProductImages: async (req, res, next) => {
    try {
      const { productId } = req.params;

      if (!req.files || req.files.length === 0) {
        throw AppError.badRequest('No files uploaded');
      }

      // Unset existing primary images for this product (admin only)
      await ProductImage.update(
        { is_primary: false },
        { where: { product_id: productId, seller_id: null } }
      );

      const uploadedImages = await Promise.all(
        req.files.map(async (file, index) => {
          const result = await uploadToCloudinary(file);

          const image = await ProductImage.create({
            product_id: productId,
            url: result.url,
            alt_text: file.originalname,
            position: index,
            is_primary: index === 0,
            seller_id: null, // Admin images have null seller_id
            created_at: new Date(),
            updated_at: new Date(),
          });

          return image;
        })
      );

      res.status(201).json({
        status: 'success',
        message: 'Admin images uploaded successfully',
        data: uploadedImages,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Seller uploads images for their product variation
   */
  sellerUploadImages: async (req, res, next) => {
    try {
      const { productId } = req.params;

      if (!req.files || req.files.length === 0) {
        throw AppError.badRequest('No files uploaded');
      }

      // Unset existing primary images for this product and seller
      await ProductImage.update(
        { is_primary: false },
        {
          where: {
            product_id: productId,
            seller_id: req.user.id,
          },
        }
      );

      const uploadedImages = await Promise.all(
        req.files.map(async (file, index) => {
          const result = await uploadToCloudinary(file);

          const image = await ProductImage.create({
            product_id: productId,
            seller_id: req.user.id,
            url: result.url,
            alt_text: file.originalname,
            position: index,
            is_primary: index === 0,
            created_at: new Date(),
            updated_at: new Date(),
          });

          return image;
        })
      );

      res.status(201).json({
        status: 'success',
        message: 'Seller images uploaded successfully',
        data: uploadedImages,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Set primary image with ownership verification
   */
  setPrimaryImage: async (req, res, next) => {
    try {
      const { imageId, productId } = req.params;
      const isSeller = req.user.role === 'seller';

      // Verify image ownership
      const image = await ProductImage.findOne({
        where: {
          id: imageId,
          product_id: productId,
          ...(isSeller ? { seller_id: req.user.id } : { seller_id: null }),
        },
      });

      if (!image) {
        throw AppError.notFound('Image not found or unauthorized');
      }

      // Unset current primary image for this context
      await ProductImage.update(
        { is_primary: false },
        {
          where: {
            product_id: productId,
            ...(isSeller ? { seller_id: req.user.id } : { seller_id: null }),
          },
        }
      );

      // Set new primary image
      await image.update({
        is_primary: true,
        updated_at: new Date(),
      });

      res.status(200).json({
        status: 'success',
        message: 'Primary image set successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update image position with ownership verification
   */
  updateImagePosition: async (req, res, next) => {
    try {
      const { imageId } = req.params;
      const { position } = req.body;
      const isSeller = req.user.role === 'seller';

      const image = await ProductImage.findOne({
        where: {
          id: imageId,
          ...(isSeller ? { seller_id: req.user.id } : { seller_id: null }),
        },
      });

      if (!image) {
        throw AppError.notFound('Image not found or unauthorized');
      }

      await image.update({
        position,
        updated_at: new Date(),
      });

      res.status(200).json({
        status: 'success',
        message: 'Image position updated',
        data: image,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete product image with ownership verification
   */
  deleteProductImage: async (req, res, next) => {
    try {
      const { imageId } = req.params;
      const isSeller = req.user.role === 'seller';

      const whereClause = {
        id: imageId,
        ...(isSeller ? { seller_id: req.user.id } : { seller_id: null }),
      };

      const deleted = await ProductImage.destroy({ where: whereClause });

      if (!deleted) {
        throw AppError.notFound('Image not found or unauthorized');
      }

      res.status(200).json({
        status: 'success',
        message: 'Image deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get admin images for a product
   */
  getAdminProductImages: async (req, res, next) => {
    try {
      const { productId } = req.params;

      const images = await ProductImage.scope([
        { method: ['productImages', productId] },
        'adminImages',
      ]).findAll({
        order: [
          ['position', 'ASC'],
          ['created_at', 'ASC'],
        ],
      });

      res.status(200).json({
        status: 'success',
        count: images.length,
        data: images,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get seller images for their product variation
   */
  getSellerProductImages: async (req, res, next) => {
    try {
      const { productId } = req.params;

      const images = await ProductImage.scope([
        { method: ['productImages', productId] },
        { method: ['sellerImages', req.user.id] },
      ]).findAll({
        order: [
          ['position', 'ASC'],
          ['created_at', 'ASC'],
        ],
      });

      res.status(200).json({
        status: 'success',
        count: images.length,
        data: images,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get primary image for a product (admin or seller)
   */
  getPrimaryImage: async (req, res, next) => {
    try {
      const { productId } = req.params;
      const isSeller = req.user.role === 'seller';

      const image = await ProductImage.scope([
        { method: ['productImages', productId] },
        'primaryImage',
        ...(isSeller ? [{ method: ['sellerImages', req.user.id] }] : ['adminImages']),
      ]).findOne();

      if (!image) {
        throw AppError.notFound('Primary image not found');
      }

      res.status(200).json({
        status: 'success',
        data: image,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Bulk update image positions
   */
  reorderImages: async (req, res, next) => {
    try {
      const { images } = req.body;
      const isSeller = req.user.role === 'seller';

      if (!Array.isArray(images)) {
        throw AppError.badRequest('Invalid payload');
      }

      // Verify all images belong to the user
      if (isSeller) {
        const imageIds = images.map((img) => img.id);
        const count = await ProductImage.count({
          where: {
            id: { [Op.in]: imageIds },
            seller_id: req.user.id,
          },
        });

        if (count !== imageIds.length) {
          throw AppError.forbidden('Unauthorized to modify some images');
        }
      }

      await Promise.all(
        images.map(({ id, position }) =>
          ProductImage.update({ position, updated_at: new Date() }, { where: { id } })
        )
      );

      res.status(200).json({
        status: 'success',
        message: 'Image order updated',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Batch delete images with ownership verification
   */
  batchDelete: async (req, res, next) => {
    try {
      const { imageIds } = req.body;
      const isSeller = req.user.role === 'seller';

      if (!Array.isArray(imageIds)) {
        throw AppError.badRequest('Invalid image IDs array');
      }

      const whereClause = {
        id: { [Op.in]: imageIds },
        ...(isSeller ? { seller_id: req.user.id } : { seller_id: null }),
      };

      const deleted = await ProductImage.destroy({ where: whereClause });

      res.status(200).json({
        status: 'success',
        deleted,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update alt text with ownership verification
   */
  updateAltText: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { alt_text } = req.body;
      const isSeller = req.user.role === 'seller';

      const image = await ProductImage.findOne({
        where: {
          id,
          ...(isSeller ? { seller_id: req.user.id } : { seller_id: null }),
        },
      });

      if (!image) {
        throw AppError.notFound('Image not found or unauthorized');
      }

      await image.update({
        alt_text,
        updated_at: new Date(),
      });

      res.status(200).json({
        status: 'success',
        message: 'Alt text updated',
        data: image,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = productImageController;
