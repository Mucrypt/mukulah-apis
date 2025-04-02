const Product = require('../models/ProductModel');
const { pool } = require('../config/db');
const AppError = require('../utils/appError');
const { withTransaction } = require('../utils/dbUtils'); // Import withTransaction
const crypto = require('crypto'); // Import crypto for generating random suffixes
const cacheService = require('../services/cacheService'); // Ensure cacheService is imported

const productController = {
  // Create a new product
  // Create a new product with variations
  createProduct: async (req, res, next) => {
    try {
      const requiredFields = ['name', 'slug', 'description', 'price', 'sku'];
      const missingFields = requiredFields.filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400));
      }

      // Validate attributes if provided
      if (req.body.attributes) {
        req.body.attributes = req.body.attributes.map((attribute) => ({
          attributeId: attribute.attribute_id || attribute.attributeId,
          valueIds: attribute.values || attribute.valueIds,
        }));

        if (!Array.isArray(req.body.attributes)) {
          return next(new AppError('Attributes must be an array', 400));
        }

        for (const attribute of req.body.attributes) {
          if (!attribute.attributeId || !Array.isArray(attribute.valueIds)) {
            return next(
              new AppError('Each attribute must have an attributeId and array of valueIds', 400)
            );
          }
        }
      }

      // Validate variations if provided
      if (req.body.variations) {
        if (!Array.isArray(req.body.variations)) {
          return next(new AppError('Variations must be an array', 400));
        }

        for (const variation of req.body.variations) {
          if (!variation.sku || !variation.price || !variation.stockQuantity) {
            return next(
              new AppError('Each variation must have sku, price, and stockQuantity', 400)
            );
          }

          if (variation.attributes && !Array.isArray(variation.attributes)) {
            return next(new AppError('Variation attributes must be an array', 400));
          }
        }
      }

      const product = new Product(pool);
      const variationModel = new (require('../models/ProductVariationModel'))(pool);

      let productId;
      await withTransaction(async (connection) => {
        let productData = {
          ...req.body,
          created_by: req.user.id,
          updated_by: req.user.id,
        };

        // Handle duplicate slugs/SKUs
        while (true) {
          try {
            productId = await product.create(productData, connection);
            break;
          } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
              if (err.message.includes('slug')) {
                productData.slug = `${req.body.slug}-${crypto.randomBytes(3).toString('hex')}`;
              } else if (err.message.includes('sku')) {
                productData.sku = `${req.body.sku}-${crypto.randomBytes(3).toString('hex')}`;
              } else {
                throw err;
              }
            } else {
              throw err;
            }
          }
        }

        // Add product attributes
        if (req.body.attributes?.length > 0) {
          await product.addAttributes(productId, req.body.attributes, connection);
        }

        // Create variations
        if (req.body.variations?.length > 0) {
          const hasDefault = req.body.variations.some((v) => v.isDefault);

          for (const [index, variation] of req.body.variations.entries()) {
            await variationModel.create(
              {
                productId,
                isDefault: !hasDefault && index === 0, // Set first as default if none specified
                ...variation,
              },
              connection
            );
          }
        }
      });

      // Get full product details with variations for response
      const createdProduct = await product.findById(productId, {
        withAttributes: true,
        withVariations: true,
      });

      res.status(201).json({
        status: 'success',
        data: {
          product: createdProduct,
        },
      });
    } catch (err) {
      console.error('Error creating product:', err);
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
      const { withImages = 'true', withBrand = 'true', withAttributes = 'true' } = req.query;

      const product = new Product(pool);
      const productData = await product.findById(parseInt(req.params.id), {
        withImages: withImages === 'true',
      });

      if (!productData) {
        return next(new AppError('No product found with that ID', 404));
      }

      // Fetch brand details if requested
      if (withBrand === 'true' && productData.brand_id) {
        const brandModel = new (require('../models/BrandModel'))(pool);
        productData.brand = await brandModel.findById(productData.brand_id);
      }

      // Fetch attributes if requested
      if (withAttributes === 'true') {
        const productAttributeModel = new (require('../models/ProductAttributeModel'))(pool);
        productData.attributes = await productAttributeModel.getAttributesByProductId(
          productData.id
        );

        // Debugging log to verify attributes
        console.log('Fetched Attributes:', productData.attributes);
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
  // Get a single product with all Details and Relationships
  // controllers/ProductController.js
  // This function retrieves a product by its ID and includes all related data such as images, categories, collections, attributes, variations, reviews, and brand.
  getCompleteProductDetails: async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        console.error('Invalid product ID provided.');
        return next(new AppError('Invalid product ID', 400));
      }

      console.log(`Fetching complete details for product ID: ${productId}`);

      // Attempt to retrieve cached data
      const cacheKey = `product:${productId}:completeDetails`;
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        console.log('Serving data from cache');
        return res.status(200).json(cachedData);
      }

      // Pagination parameters
      const relatedLimit = parseInt(req.query.relatedLimit) || 5;
      const relatedOffset = parseInt(req.query.relatedOffset) || 0;
      const crossSellLimit = parseInt(req.query.crossSellLimit) || 5;
      const crossSellOffset = parseInt(req.query.crossSellOffset) || 0;
      const upSellLimit = parseInt(req.query.upSellLimit) || 5;
      const upSellOffset = parseInt(req.query.upSellOffset) || 0;

      const product = new Product(pool);
      const relationshipModel = new (require('../models/ProductRelationshipModel'))(pool);

      const [
        productData,
        relatedProducts,
        relatedCount,
        crossSellProducts,
        crossSellCount,
        upSellProducts,
        upSellCount,
      ] = await Promise.all([
        product.findById(productId, {
          withImages: true,
          withCategories: true,
          withCollections: true,
          withAttributes: true,
          withVariations: true,
          withReviews: true,
          withBrand: true,
        }),
        relationshipModel.getRelatedProducts(productId, {
          limit: relatedLimit,
          offset: relatedOffset,
        }),
        relationshipModel.getRelatedProductsCount(productId),
        relationshipModel.getCrossSellProducts(productId, {
          limit: crossSellLimit,
          offset: crossSellOffset,
        }),
        relationshipModel.getCrossSellProductsCount(productId),
        relationshipModel.getUpSellProducts(productId, {
          limit: upSellLimit,
          offset: upSellOffset,
        }),
        relationshipModel.getUpSellProductsCount(productId),
      ]);

      if (!productData) {
        console.error(`No product found with ID: ${productId}`);
        return next(new AppError('Product not found', 404));
      }

      const response = {
        status: 'success',
        data: {
          product: {
            ...productData,
            relationships: {
              related: {
                products: relatedProducts,
                meta: {
                  total: relatedCount,
                  limit: relatedLimit,
                  offset: relatedOffset,
                  pages: Math.ceil(relatedCount / relatedLimit),
                },
              },
              crossSell: {
                products: crossSellProducts,
                meta: {
                  total: crossSellCount,
                  limit: crossSellLimit,
                  offset: crossSellOffset,
                  pages: Math.ceil(crossSellCount / crossSellLimit),
                },
              },
              upSell: {
                products: upSellProducts,
                meta: {
                  total: upSellCount,
                  limit: upSellLimit,
                  offset: upSellOffset,
                  pages: Math.ceil(upSellCount / upSellLimit),
                },
              },
            },
          },
        },
      };

      // Cache the response
      await cacheService.set(cacheKey, response);

      res.status(200).json(response);
    } catch (err) {
      console.error('Error retrieving complete product details:', err.message);
      next(new AppError('Failed to retrieve product details', 500));
    }
  },
  // Update a product
  updateProduct: async (req, res, next) => {
    try {
      if (Object.keys(req.body).length === 0) {
        return next(
          new AppError('No update data provided. Please provide valid fields to update.', 400)
        );
      }

      const validFields = [
        'name',
        'slug',
        'description',
        'short_description',
        'price',
        'discount_price',
        'cost_price',
        'sku',
        'upc',
        'ean',
        'isbn',
        'brand_id',
        'stock_quantity',
        'stock_status',
        'weight',
        'length',
        'width',
        'height',
        'min_order_quantity',
        'status',
        'is_featured',
        'is_bestseller',
        'is_new',
        'needs_shipping',
        'tax_class',
        'views_count',
        'sales_count',
        'wishlist_count',
        'rating_total',
        'rating_count',
        'average_rating',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'created_at',
        'updated_at',
        'categories',
        'collections',
        'attributes',
      ];

      const updates = {};

      for (const field of validFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return next(new AppError('No valid fields provided for update.', 400));
      }

      const product = new Product(pool);
      const updatedRows = await product.update(parseInt(req.params.id), updates);

      if (updatedRows === 0) {
        return next(new AppError('No product found with that ID.', 404));
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

      res.status(200).json({
        status: 'success',
        message: 'Product deleted successfully',
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
      const productId = req.params.id;
      const limit = req.query.limit || 5;

      const relationshipModel = new (require('../models/ProductRelationshipModel'))(pool);
      const relatedProducts = await relationshipModel.getRelatedProducts(productId, { limit });

      res.status(200).json({
        status: 'success',
        results: relatedProducts.length,
        data: { products: relatedProducts },
      });
    } catch (error) {
      if (error.message.includes('No related products found')) {
        return res.status(404).json({
          status: 'fail',
          message: error.message,
        });
      }
      next(new AppError('Failed to fetch related products', 500));
    }
  },

  // Get cross-sell products
  getCrossSellProducts: async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10); // Ensure productId is an integer
      const limit = parseInt(req.query.limit) || 5; // Ensure limit is an integer

      if (isNaN(productId)) {
        return next(new AppError('Invalid product ID: must be a number', 400));
      }

      if (isNaN(limit) || limit <= 0) {
        return next(new AppError('Invalid limit: must be a positive number', 400));
      }

      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);
      const products = await productRelationship.getCrossSellProducts(productId, { limit });

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
      const productId = parseInt(req.params.id, 10); // Ensure productId is an integer
      const limit = parseInt(req.query.limit) || 5; // Ensure limit is an integer

      if (isNaN(productId)) {
        return next(new AppError('Invalid product ID: must be a number', 400));
      }

      if (isNaN(limit) || limit <= 0) {
        return next(new AppError('Invalid limit: must be a positive number', 400));
      }

      const productRelationship = new (require('../models/ProductRelationshipModel'))(pool);
      const products = await productRelationship.getUpSellProducts(productId, { limit });

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
