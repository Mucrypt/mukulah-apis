const Attribute = require('../models/entities/Attribute'); // Add this line
const AttributeValue = require('../models/entities/AttributeValue'); // Add this line
const { pool } = require('../config/db');
const AppError = require('../utils/appError');
const { withTransaction } = require('../utils/dbUtils'); // Import withTransaction
const RelatedProduct = require('../models/entities/RelatedProduct'); // or wherever your file is
const CrossSellProduct = require('../models/entities/CrossSellProduct');
const UpSellProduct = require('../models/entities/UpSellProduct');
const ProductImage = require('../models/entities/ProductImage');


const cacheService = require('../services/cacheService'); // Ensure cacheService is imported
const { Product, ProductAttribute, VariationAttribute } = require('../models/associations');

const ProductAttributeValue = require('../models/entities/ProductAttributeValue');
const { Op } = require('sequelize');
const slugify = require('slugify');
const crypto = require('crypto');

const productController = {
  // Create a new product
  // Create a new product
  //Admin can create a new product with required fields: name, price, and sku.
  createProduct: async (req, res, next) => {
    try {
      const requiredFields = ['name', 'price', 'sku'];
      const missingFields = requiredFields.filter((field) => !req.body[field]);
      if (missingFields.length > 0) {
        return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400));
      }

      let slug = slugify(req.body.name, { lower: true, strict: true });
      let sku = req.body.sku;

      const existingSlug = await Product.findOne({ where: { slug } });
      if (existingSlug) slug += '-' + crypto.randomBytes(2).toString('hex');

      const existingSku = await Product.findOne({ where: { sku } });
      if (existingSku) sku += '-' + crypto.randomBytes(2).toString('hex');

      const product = await Product.create({
        ...req.body,
        slug,
        sku,
      });

      res.status(201).json({
        status: 'success',
        message: 'Product created successfully',
        data: product,
      });
    } catch (err) {
      console.error('Error creating product:', err);
      next(new AppError('Failed to create product', 500));
    }
  },

  // Get all products
  // Get all products
  // Get all products
  getAllProducts: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const offset = (page - 1) * limit;

      const whereConditions = {};
      let order = [['created_at', 'DESC']];

      // Handle sorting
      if (req.query.sort) {
        const [field, direction] = req.query.sort.split(':');
        if (field && direction) {
          order = [[field, direction.toUpperCase()]];
        }
      }

      // Handle categoryId
      if (req.query.categoryId) {
        whereConditions.categoryId = req.query.categoryId;
      }

      // Handle price range
      if (req.query.minPrice || req.query.maxPrice) {
        whereConditions.price = {
          ...(req.query.minPrice && { [Op.gte]: parseFloat(req.query.minPrice) }),
          ...(req.query.maxPrice && { [Op.lte]: parseFloat(req.query.maxPrice) }),
        };
      }

      // Handle filters
      if (req.query.filters) {
        const filters = JSON.parse(req.query.filters);
        Object.keys(filters).forEach((key) => {
          whereConditions[key] = { [Op.in]: filters[key] };
        });
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where: whereConditions,
        offset,
        limit,
        order,
        include: [
          {
            association: 'productImages', // Changed from 'images' to match your model
            attributes: ['url', 'alt_text', 'is_primary'],
            where: { is_primary: true },
            required: false,
          },
        ],
      });

      // Transform products to match frontend expectations
      const transformedProducts = products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        discount_price: product.discount_price,
        average_rating: product.average_rating || 0,
        review_count: product.review_count || 0,
        image_url: product.productImages?.[0]?.url || '/default-product-image.jpg',
        is_featured: product.is_featured || false,
        is_bestseller: product.is_bestseller || false,
        is_new: product.is_new || false,
        stock_status: product.stock_status || 'in_stock',
      }));

      res.status(200).json({
        products: transformedProducts,
        page,
        pages: Math.ceil(count / limit),
        total: count,
      });
    } catch (err) {
      console.error('Error getting products:', err);
      next(new AppError('Failed to retrieve products', 500));
    }
  },
  // Get a single product
  // Get a single product
  getProduct: async (req, res, next) => {
    try {
      const { withImages = 'true', withBrand = 'true', withAttributes = 'true' } = req.query;
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) return next(new AppError('Invalid product ID', 400));

      const include = [];

    if (withImages === 'true') {
      include.push({ association: 'productImages' }); // ✅ this matches associations.js
    }


      if (withBrand === 'true') {
        include.push({ association: 'brand' });
      }

      if (withAttributes === 'true') {
        include.push({
          association: 'productAttributes',
          through: { attributes: [] }, // ✅ valid here because it's many-to-many
          include: [
            {
              association: 'values', // ✅ one-to-many, so no `through` here
            },
          ],
        });
      }

      const product = await Product.findByPk(productId, { include });
      if (!product) return next(new AppError('No product found with that ID', 404));

      res.status(200).json({ status: 'success', data: { product } });
    } catch (err) {
      console.error('Error getting product:', err);
      next(new AppError('Failed to retrieve product', 500));
    }
  },

  // Get a single product with all Details and Relationships
  // controllers/ProductController.js
  // This function retrieves a product by its ID and includes all related data such as images, categories, collections, attributes, variations, reviews, and brand.
  // controllers/ProductController.js

  getCompleteProductDetails: async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return next(new AppError('Invalid product ID', 400));
      }

      const cacheKey = `product:${productId}:completeDetails`;
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        console.log('[CACHE] Serving product from cache:', cacheKey);
        return res.status(200).json(cachedData);
      }

      console.log('[DEBUG] Product associations:', Object.keys(Product.associations));

      const product = await Product.findByPk(productId, {
        include: [
          { association: 'productImages' },
          { association: 'categories' },
          { association: 'collections' },
          {
            association: 'productAttributes',
            through: {
              attributes: ['product_id', 'attribute_id'], // Keep this because it's needed
            },
            include: [
              {
                association: 'values', // Attribute ➝ AttributeValue (hasMany)
              },
            ],
          },
          {
            association: 'variations',
            include: [
              {
                association: 'attributes', // already defined with attributes: [] in associations.js
              },
              {
                association: 'attributeValues', // already defined with attributes: [] in associations.js
              },
              {
                association: 'image',
              },
            ],
          },
          {
            association: 'reviews',
            required: false,
            where: { is_approved: true },
            include: [
              {
                association: 'user',
                attributes: ['id', 'name', 'avatar_url'],
              },
            ],
          },
          { association: 'brand' },
          { association: 'seller' },
        ],
      });

      if (!product) {
        return next(new AppError('Product not found', 404));
      }

      const relationshipModel = new (require('../models/ProductRelationshipModel'))(pool);
      const [
        relatedProducts,
        relatedCount,
        crossSellProducts,
        crossSellCount,
        upSellProducts,
        upSellCount,
      ] = await Promise.all([
        relationshipModel.getRelatedProducts(productId, {
          limit: parseInt(req.query.relatedLimit) || 5,
          offset: parseInt(req.query.relatedOffset) || 0,
        }),
        relationshipModel.getRelatedProductsCount(productId),
        relationshipModel.getCrossSellProducts(productId, {
          limit: parseInt(req.query.crossSellLimit) || 5,
          offset: parseInt(req.query.crossSellOffset) || 0,
        }),
        relationshipModel.getCrossSellProductsCount(productId),
        relationshipModel.getUpSellProducts(productId, {
          limit: parseInt(req.query.upSellLimit) || 5,
          offset: parseInt(req.query.upSellOffset) || 0,
        }),
        relationshipModel.getUpSellProductsCount(productId),
      ]);

      const response = {
        status: 'success',
        data: {
          product: {
            ...product.toJSON(),
            relationships: {
              related: {
                products: relatedProducts,
                meta: {
                  total: relatedCount,
                  limit: parseInt(req.query.relatedLimit) || 5,
                  offset: parseInt(req.query.relatedOffset) || 0,
                  pages: Math.ceil(relatedCount / (parseInt(req.query.relatedLimit) || 5)),
                },
              },
              crossSell: {
                products: crossSellProducts,
                meta: {
                  total: crossSellCount,
                  limit: parseInt(req.query.crossSellLimit) || 5,
                  offset: parseInt(req.query.crossSellOffset) || 0,
                  pages: Math.ceil(crossSellCount / (parseInt(req.query.crossSellLimit) || 5)),
                },
              },
              upSell: {
                products: upSellProducts,
                meta: {
                  total: upSellCount,
                  limit: parseInt(req.query.upSellLimit) || 5,
                  offset: parseInt(req.query.upSellOffset) || 0,
                  pages: Math.ceil(upSellCount / (parseInt(req.query.upSellLimit) || 5)),
                },
              },
            },
          },
        },
      };

      await cacheService.set(cacheKey, response);
      res.status(200).json(response);
    } catch (err) {
      console.error('[ERROR] Failed to retrieve product details:', err);
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

      const [affectedRows] = await Product.update(updates, {
        where: { id: parseInt(req.params.id, 10) },
      });

      if (affectedRows === 0) {
        return next(new AppError('No product found with that ID.', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Product updated successfully',
        data: {
          affectedRows,
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
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return next(new AppError('Invalid product ID', 400));
      }

      const deletedRows = await Product.destroy({
        where: { id: productId },
      });

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
  // Increment product views
  incrementProductViews: async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return next(new AppError('Invalid product ID', 400));
      }

      const product = await Product.findByPk(productId);
      if (!product) {
        return next(new AppError('Product not found', 404));
      }

      await product.increment('views_count');

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
  // Get related products (based on shared categories)
  getRelatedProducts: async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const limit = parseInt(req.query.limit) || 5;

      // Get related product IDs
      const relatedProductRows = await RelatedProduct.findAll({
        where: { product_id: productId },
        attributes: ['related_product_id'],
        limit,
      });

      if (!relatedProductRows.length) {
        return res.status(404).json({
          status: 'fail',
          message: 'No related products found',
        });
      }

      const relatedProductIds = relatedProductRows.map((row) => row.related_product_id);

      // Fetch related product details with images
      const relatedProducts = await Product.findAll({
        where: { id: relatedProductIds },
        include: [
          {
            association: 'images',
            attributes: ['url', 'alt_text', 'is_primary'],
          },
        ],
      });

      res.status(200).json({
        status: 'success',
        results: relatedProducts.length,
        data: { products: relatedProducts },
      });
    } catch (error) {
      console.error('Error fetching related products:', error);
      next(new AppError('Failed to fetch related products', 500));
    }
  },

  // Get cross-sell products
  getCrossSellProducts: async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const limit = parseInt(req.query.limit) || 5;

      if (isNaN(productId)) return next(new AppError('Invalid product ID', 400));
      if (isNaN(limit) || limit <= 0) return next(new AppError('Invalid limit', 400));

      const crossSells = await CrossSellProduct.findAll({
        where: { product_id: productId },
        attributes: ['cross_sell_product_id'],
        limit,
      });

      const crossSellIds = crossSells.map((item) => item.cross_sell_product_id);

      const products = await Product.findAll({
        where: { id: crossSellIds },
        include: [
          {
            association: 'images',
            attributes: ['url', 'alt_text', 'is_primary'],
          },
        ],
      });

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: { products },
      });
    } catch (err) {
      console.error('Error getting cross-sell products:', err);
      next(new AppError('Failed to get cross-sell products', 500));
    }
  },
  // Get up-sell products
  getUpSellProducts: async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const limit = parseInt(req.query.limit) || 5;

      if (isNaN(productId)) return next(new AppError('Invalid product ID', 400));
      if (isNaN(limit) || limit <= 0) return next(new AppError('Invalid limit', 400));

      const upSells = await UpSellProduct.findAll({
        where: { product_id: productId },
        attributes: ['up_sell_product_id'],
        limit,
      });

      const upSellIds = upSells.map((item) => item.up_sell_product_id);

      const products = await Product.findAll({
        where: { id: upSellIds },
        include: [
          {
            association: 'images',
            attributes: ['url', 'alt_text', 'is_primary'],
          },
        ],
      });

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: { products },
      });
    } catch (err) {
      console.error('Error getting up-sell products:', err);
      next(new AppError('Failed to get up-sell products', 500));
    }
  },
};
module.exports = productController;
