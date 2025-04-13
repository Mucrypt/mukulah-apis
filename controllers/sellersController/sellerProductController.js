// backend/controllers/sellerProductController.js
const Product = require('../../models/entities/Product');
const AppError = require('../../utils/appError');
const slugify = require('slugify');
const crypto = require('crypto');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
  const { Parser } = require('json2csv');
 const SellerProduct = require('../../models/entities/SellerProduct'); // ✅
 const { sequelize } = require('../../config/db'); // ✅



const sellerProductController = {
  /**
   * Create Product
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  createProduct: async (req, res, next) => {
    try {
      const { name, price, sku, categoryIds, tagIds } = req.body;

      if (!name || !price || !sku) {
        return next(new AppError('Name, price, and sku are required', 400));
      }

      if (isNaN(price) || price <= 0) {
        return next(new AppError('Price must be a positive number', 400));
      }

      let slug = slugify(name, { lower: true, strict: true });
      const existingSlug = await Product.findOne({ where: { slug } });
      if (existingSlug) slug += '-' + crypto.randomBytes(4).toString('hex');

      let finalSku = sku;
      const existingSku = await Product.findOne({ where: { sku: finalSku } });
      if (existingSku) finalSku += '-' + crypto.randomBytes(4).toString('hex');

      const product = await Product.create({
        ...req.body,
        slug,
        sku: finalSku,
        seller_id: req.user.id,
        status: 'draft',
      });

      if (categoryIds?.length) await product.setCategories(categoryIds);
      if (tagIds?.length) await product.setTags(tagIds);

      await SellerProduct.create({
        product_id: product.id,
        seller_id: req.user.id,
        price: product.price,
        stock_quantity: product.stock_quantity || 0,
        stock_status: product.stock_status || 'in_stock',
        condition: 'new',
        sku: product.sku,
        is_approved: false,
      });

      res.status(201).json({ status: 'success', data: { product } });
    } catch (err) {
      next(new AppError(err.message || 'Failed to create product', 500));
    }
  },

  /**
   * Get all seller products with pagination
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  getMyProducts: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows: products } = await Product.findAndCountAll({
        where: { seller_id: req.user.id },
        include: [
          { association: 'categories', through: { attributes: [] } },
          { association: 'tags', through: { attributes: [] } },
          {
            model: SellerProduct,
            as: 'sellerProducts',
            where: { seller_id: req.user.id },
            attributes: ['stock_quantity', 'is_approved', 'sku', 'condition'],
          },
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      res.status(200).json({
        status: 'success',
        results: count,
        page,
        totalPages: Math.ceil(count / limit),
        data: { products },
      });
    } catch (err) {
      next(new AppError(err.message || 'Failed to get seller products', 500));
    }
  },

  /**
   * Update Product (only by owner)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  updateMyProduct: async (req, res, next) => {
    try {
      const product = await Product.findOne({
        where: {
          id: req.params.id,
          seller_id: req.user.id,
        },
      });

      if (!product) {
        return next(new AppError('Product not found or not owned by seller', 404));
      }

      // Prevent updating certain fields
      const { id, seller_id, created_at, ...updateData } = req.body;

      await product.update(updateData);

      res.status(200).json({
        status: 'success',
        message: 'Product updated',
        data: { product },
      });
    } catch (err) {
      next(new AppError(err.message || 'Failed to update product', 500));
    }
  },

  /**
   * Delete Product (only by owner)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  deleteMyProduct: async (req, res, next) => {
    try {
      const deleted = await Product.destroy({
        where: {
          id: req.params.id,
          seller_id: req.user.id,
        },
      });

      if (!deleted) {
        return next(new AppError('Product not found or not owned by seller', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Product deleted',
      });
    } catch (err) {
      next(new AppError(err.message || 'Failed to delete product', 500));
    }
  },

  /**
   * Bulk Upload Products from CSV
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  bulkUploadProducts: async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        return next(new AppError('No file uploaded', 400));
      }

      const filePath = path.resolve(file.path);
      const sellerId = req.user.id;
      const products = [];
      let rowCount = 0;
      let errorCount = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          try {
            // Validate required fields
            if (!row.name || !row.price || !row.sku) {
              errorCount++;
              return;
            }

            // Validate price is a number
            const price = parseFloat(row.price);
            if (isNaN(price) || price <= 0) {
              errorCount++;
              return;
            }

            const slug =
              slugify(row.name, { lower: true, strict: true }) +
              '-' +
              crypto.randomBytes(4).toString('hex');

            products.push({
              name: row.name,
              slug,
              description: row.description || '',
              price,
              sku: row.sku + '-' + crypto.randomBytes(4).toString('hex'), // Ensure unique SKU
              stock_quantity: parseInt(row.stock_quantity) || 0,
              status: ['draft', 'published', 'archived'].includes(row.status?.toLowerCase())
                ? row.status.toLowerCase()
                : 'draft',
              seller_id: sellerId,
            });
          } catch (err) {
            errorCount++;
          }
        })
        .on('end', async () => {
          try {
            if (products.length === 0) {
              fs.unlinkSync(filePath);
              return next(new AppError('No valid products found in the CSV file', 400));
            }

            const createdProducts = await Product.bulkCreate(products);
            fs.unlinkSync(filePath); // Clean up

            res.status(201).json({
              status: 'success',
              message: `${createdProducts.length} products uploaded successfully (${errorCount} errors)`,
              data: createdProducts,
            });
          } catch (err) {
            fs.unlinkSync(filePath);
            next(new AppError(err.message || 'Failed to create products from CSV', 500));
          }
        })
        .on('error', (err) => {
          fs.unlinkSync(filePath);
          next(new AppError('Error reading CSV file', 500));
        });
    } catch (err) {
      if (req.file?.path) fs.unlinkSync(req.file.path);
      next(new AppError(err.message || 'Bulk upload failed', 500));
    }
  },

  /**
   * Duplicate Product
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  duplicateProduct: async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return next(new AppError('Invalid product ID', 400));
      }

      const originalProduct = await Product.findOne({
        where: {
          id: productId,
          seller_id: req.user.id,
        },
      });

      if (!originalProduct) {
        return next(new AppError('Product not found or not owned by seller', 404));
      }

      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const productData = originalProduct.toJSON();

      const duplicatedProduct = await Product.create({
        ...productData,
        id: undefined, // Ensure new ID is generated
        name: `${productData.name} (Copy)`,
        slug: `${slugify(productData.name, { lower: true, strict: true })}-${randomSuffix}`,
        sku: `${productData.sku}-${randomSuffix}`,
        created_at: new Date(),
        updated_at: new Date(),
        status: 'draft', // Reset status to draft for the copy
      });

      res.status(201).json({
        status: 'success',
        message: 'Product duplicated successfully',
        data: duplicatedProduct,
      });
    } catch (err) {
      next(new AppError(err.message || 'Failed to duplicate product', 500));
    }
  },

  /**
   * Update Product Status
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  updateProductStatus: async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      const { status } = req.body;

      if (!['draft', 'published', 'archived'].includes(status)) {
        return next(
          new AppError('Invalid status. Must be one of: draft, published, archived', 400)
        );
      }

      const product = await Product.findOne({
        where: {
          id: productId,
          seller_id: req.user.id,
        },
      });

      if (!product) {
        return next(new AppError('Product not found or not owned by this seller', 404));
      }

      await product.update({ status });

      res.status(200).json({
        status: 'success',
        message: `Product status updated to ${status}`,
        data: product,
      });
    } catch (err) {
      next(new AppError(err.message || 'Failed to update product status', 500));
    }
  },
  /**
   * Get low-stock products
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  getLowStockProducts: async (req, res, next) => {
    try {
      const threshold = parseInt(req.query.threshold) || 5;

      const products = await Product.findAll({
        where: {
          seller_id: req.user.id,
          stock_quantity: { [Op.lt]: threshold },
        },
        order: [['stock_quantity', 'ASC']],
      });

      res.status(200).json({
        status: 'success',
        message: `Products with stock less than ${threshold}`,
        count: products.length,
        data: products,
      });
    } catch (err) {
      console.error('❌ Error fetching low-stock products:', err);
      next(new AppError('Failed to fetch low-stock products', 500));
    }
  },

  /**
   * Get product analytics
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   *
   * */

  getProductAnalytics: async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) return next(new AppError('Invalid product ID', 400));

      const product = await Product.findOne({
        where: {
          id: productId,
          seller_id: req.user.id,
        },
        attributes: [
          'id',
          'name',
          'views_count',
          'sales_count',
          'wishlist_count',
          'rating_total',
          'rating_count',
          'average_rating',
          'stock_quantity',
        ],
      });

      if (!product) return next(new AppError('Product not found or access denied', 404));

      res.status(200).json({
        status: 'success',
        data: {
          product_id: product.id,
          name: product.name,
          views: product.views_count,
          sales: product.sales_count,
          wishlist: product.wishlist_count,
          rating_total: product.rating_total,
          rating_count: product.rating_count,
          average_rating: product.average_rating,
          stock_quantity: product.stock_quantity,
        },
      });
    } catch (err) {
      console.error('❌ Error fetching product analytics:', err);
      next(new AppError('Failed to fetch product analytics', 500));
    }
  },

  /**
   * Export Products as CSV
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  exportProductsAsCSV: async (req, res, next) => {
    try {
      const products = await Product.findAll({
        where: { seller_id: req.user.id },
        attributes: [
          'id',
          'name',
          'slug',
          'price',
          'stock_quantity',
          'status',
          'sku',
          'views_count',
          'sales_count',
          'wishlist_count',
          'average_rating',
          'created_at',
          'updated_at',
        ],
        raw: true,
      });

      if (!products || products.length === 0) {
        return next(new AppError('No products found for export.', 404));
      }

      const fields = Object.keys(products[0]);
      const json2csv = new Parser({ fields });
      const csv = json2csv.parse(products);

      res.header('Content-Type', 'text/csv');
      res.attachment('seller_products_export.csv');
      return res.send(csv);
    } catch (err) {
      console.error('❌ Failed to export products:', err);
      next(new AppError('Failed to export products', 500));
    }
  },
};

module.exports = sellerProductController;
