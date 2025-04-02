const { pool } = require('../config/db');
const AppError = require('../utils/appError');
const { withTransaction } = require('../utils/transaction');

const productVariationController = {
  // Create product variation
  createVariation: async (req, res, next) => {
    try {
      const { sku, price, discountPrice, stockQuantity, imageId, isDefault, attributes } = req.body;

      // Validate required fields
      if (!sku || price === undefined || stockQuantity === undefined) {
        return next(new AppError('SKU, price and stockQuantity are required', 400));
      }

      const productVariation = new (require('../models/ProductVariationModel'))(pool);

      // Check for duplicate SKU
      const existing = await productVariation.findBySku(sku);
      if (existing) {
        console.error(`Conflict: SKU "${sku}" already exists for product ID ${existing.productId}`);
        return next(new AppError(`SKU "${sku}" already exists`, 400));
      }

      try {
        const variationId = await productVariation.create({
          productId: req.params.productId,
          sku,
          price,
          discountPrice,
          stockQuantity,
          imageId,
          isDefault,
          attributes: attributes || [],
        });

        res.status(201).json({
          status: 'success',
          data: { variationId },
        });
      } catch (err) {
        if (err.message.includes('Attribute value not found')) {
          return next(new AppError(err.message, 400));
        }
        throw err;
      }
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

      // Debug log for quantity
      console.log('Received quantity:', quantity);

      // Validate the quantity field
      if (quantity === undefined || quantity === null) {
        return next(new AppError('Quantity is required and must not be null or undefined', 400));
      }

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

  // Get all variations for a product
  getAllVariations: async (req, res, next) => {
    try {
      const productVariation = new (require('../models/ProductVariationModel'))(pool);
      const variations = await productVariation.findByProductId(req.params.productId);

      res.status(200).json({
        status: 'success',
        data: { variations, count: variations.length },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get all variations with attributes
  getAllVariationsWithAttributes: async (req, res, next) => {
    try {
      const productVariation = new (require('../models/ProductVariationModel'))(pool);
      const variations = await productVariation.findByProductIdWithDetails(req.params.productId);

      res.status(200).json({
        status: 'success',
        data: { variations, count: variations.length },
      });
    } catch (err) {
      next(err);
    }
  },

  // Bulk update stock
  bulkUpdateStock: async (req, res, next) => {
    try {
      const { updates } = req.body;
      const productVariation = new (require('../models/ProductVariationModel'))(pool);

      await withTransaction(async (connection) => {
        for (const update of updates) {
          await productVariation.updateStock(update.variationId, update.quantity, connection);
        }
      });

      res.status(200).json({
        status: 'success',
        message: 'Bulk stock update completed',
      });
    } catch (err) {
      next(err);
    }
  },

  // Generate SKUs
  generateSkus: async (req, res, next) => {
    try {
      const { baseSku } = req.body;
      const productModel = new (require('../models/ProductModel'))(pool);

      // 1. First verify the product exists
      const product = await productModel.findById(req.params.productId, {
        withAttributes: true,
      });

      if (!product) {
        return next(new AppError('Product not found', 404));
      }

      // 2. Check if attributes exist and is an array
      if (!product.attributes || !Array.isArray(product.attributes)) {
        return next(new AppError('Product has no attributes defined', 400));
      }

      // 3. Generate SKUs safely with fallbacks
      const generated = product.attributes.map((attr) => ({
        attribute: attr.name || 'attribute',
        values: (attr.values || []).map((val) => ({
          value: val.value || 'value',
          sku: `${baseSku}-${attr.slug || 'attr'}-${val.slug || 'val'}`,
        })),
      }));

      res.status(200).json({
        status: 'success',
        data: generated,
      });
    } catch (err) {
      next(err);
    }
  },

  // Get product attributes
  getProductAttributes: async (req, res, next) => {
    try {
      const productModel = new (require('../models/ProductModel'))(pool);
      const product = await productModel.findById(req.params.productId);

      res.status(200).json({
        status: 'success',
        data: { attributes: product.attributes },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get single variation details
  getVariationById: async (req, res, next) => {
    try {
      const productVariation = new (require('../models/ProductVariationModel'))(pool);
      const variation = await productVariation.findById(req.params.variationId);

      if (!variation) {
        return next(new AppError('No variation found with that ID', 404));
      }

      // Replace null values with defaults
      const sanitizedVariation = {
        ...variation,
        weight: variation.weight || 0,
        length: variation.length || 0,
        width: variation.width || 0,
        height: variation.height || 0,
        image_id: variation.image_id || 'N/A',
      };

      res.status(200).json({
        status: 'success',
        data: { variation: sanitizedVariation },
      });
    } catch (err) {
      next(err);
    }
  },

  // Generate combinations
  generateCombinations: async (req, res, next) => {
    try {
      const productModel = new (require('../models/ProductModel'))(pool);
      const product = await productModel.findById(req.params.productId);

      const generateCombos = (attributes) => {
        if (attributes.length === 0) return [];
        if (attributes.length === 1) return attributes[0].values.map((v) => [v]);

        const [first, ...rest] = attributes;
        const restCombos = generateCombos(rest);

        return first.values.flatMap((value) => restCombos.map((combo) => [value, ...combo]));
      };

      const combinations = generateCombos(product.attributes);

      res.status(200).json({
        status: 'success',
        data: { combinations, count: combinations.length },
      });
    } catch (err) {
      next(err);
    }
  },

  // Bulk create variations
  bulkCreateVariations: async (req, res, next) => {
    try {
      const { variations } = req.body;
      const productVariation = new (require('../models/ProductVariationModel'))(pool);

      const createdIds = await Promise.all(
        variations.map((variation) =>
          productVariation.create({
            productId: req.params.productId,
            ...variation,
          })
        )
      );

      res.status(201).json({
        status: 'success',
        data: { variationIds: createdIds, count: createdIds.length },
      });
    } catch (err) {
      next(err);
    }
  },

  // Update variation status
  updateVariationStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      const productVariation = new (require('../models/ProductVariationModel'))(pool);
      const updatedRows = await productVariation.updateStatus(req.params.variationId, status);

      if (updatedRows === 0) {
        return next(new AppError('No variation found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Variation status updated',
      });
    } catch (err) {
      next(err);
    }
  },

  // Add image to variation
  addVariationImage: async (req, res, next) => {
    try {
      const { imageId } = req.body;
      const productVariation = new (require('../models/ProductVariationModel'))(pool);
      const updatedRows = await productVariation.updateImage(req.params.variationId, imageId);

      if (updatedRows === 0) {
        return next(new AppError('No variation found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Variation image added',
      });
    } catch (err) {
      next(err);
    }
  },

  // Remove image from variation
  removeVariationImage: async (req, res, next) => {
    try {
      const productVariation = new (require('../models/ProductVariationModel'))(pool);
      const [result] = await productVariation.pool.execute(
        `UPDATE product_variations SET image_id = NULL 
         WHERE id = ? AND image_id = ?`,
        [req.params.variationId, req.params.imageId]
      );

      if (result.affectedRows === 0) {
        return next(new AppError('No variation/image combination found', 404));
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
