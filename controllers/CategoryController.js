const Category = require('../models/entities/Category');
const Product = require('../models/entities/Product');
const { pool } = require('../config/db');
const { AppError } = require('../utils/appError');

const logger = require('../utils/logger');
const NestedSetService = require('../services/NestedSetService');
const sequelize = require('../config/db').sequelize;
const { Op } = require('sequelize');

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const categoryController = {
  // ==================== CORE CRUD OPERATIONS ====================

  createCategory: async (req, res, next) => {
    try {
      const { name, slug, description, imageUrl, parentId } = req.body;

      if (!name || !slug) {
        logger.warn('Category creation attempted with missing required fields');
        return next(new AppError('Name and slug are required', 400));
      }

      // Fetch the parent category to calculate `lft`, `rgt`, and `depth`
      let lft = 1;
      let rgt = 2;
      let depth = 0;

      if (parentId) {
        const parentCategory = await Category.findByPk(parentId);
        if (!parentCategory) {
          return next(new AppError('Parent category not found', 404));
        }

        // Calculate `lft`, `rgt`, and `depth` based on the parent category
        lft = parentCategory.rgt;
        rgt = parentCategory.rgt + 1;
        depth = parentCategory.depth + 1;

        // Update the parent's `rgt` to make space for the new category
        await Category.update(
          { rgt: sequelize.literal('rgt + 2') },
          { where: { rgt: { [Op.gte]: parentCategory.rgt } } }
        );
        await Category.update(
          { lft: sequelize.literal('lft + 2') },
          { where: { lft: { [Op.gt]: parentCategory.rgt } } }
        );
      }

      // Create the new category
      const category = await Category.create({
        name,
        slug,
        description,
        image_url: imageUrl,
        parent_id: parentId,
        lft,
        rgt,
        depth,
      });

      logger.info(`Category created with ID: ${category.id}`);

      res.status(201).json({
        status: 'success',
        message: 'Category created successfully',
        data: {
          categoryId: category.id,
        },
      });
    } catch (err) {
      logger.error(`Category creation error: ${err.message}`);
      next(err);
    }
  },

  getCategoryTree: async (req, res, next) => {
    try {
      const { language } = req.query;
      const category = new Category(pool);

      // Use the nested set model to get the full tree
      const tree = await NestedSetService.getFullTree();

      // Localize if needed
      if (language) {
        // Add localization logic here
      }

      res.status(200).json({
        status: 'success',
        results: tree.length,
        data: {
          categories: tree,
        },
      });
    } catch (err) {
      logger.error(`Error getting category tree: ${err.message}`);
      next(new AppError('Failed to retrieve category tree. Please try again later.', 500));
    }
  },

  // filepath: c:\Users\romeo\OneDrive\Desktop\mukulah-shop\backend\controllers\CategoryController.js
  rebuildCategoryTree: async (req, res, next) => {
    try {
      // Fetch all categories from the database
      const categories = await Category.findAll({
        order: [
          ['parent_id', 'ASC'],
          ['id', 'ASC'],
        ],
      });

      // Build a tree structure from the categories
      const buildTree = (nodes, parentId = null) => {
        return nodes
          .filter((node) => node.parent_id === parentId)
          .map((node) => ({
            id: node.id,
            parent_id: node.parent_id,
            children: buildTree(nodes, node.id),
          }));
      };

      const tree = buildTree(categories);

      // Rebuild the nested set model using the tree
      await NestedSetService.rebuildTree(tree);

      res.status(200).json({
        status: 'success',
        message: 'Category tree rebuilt successfully',
      });
    } catch (err) {
      logger.error(`Error rebuilding category tree: ${err.message}`);
      next(new AppError('Failed to rebuild category tree', 500));
    }
  },

  getCategory: async (req, res, next) => {
    try {
      const {
        withChildren = 'false',
        withProducts = 'false',
        withAnalytics = 'false',
        language,
      } = req.query;

      const include = [];

      if (withChildren === 'true') {
        include.push({
          association: 'subcategories',
          required: false,
          include: [
            {
              association: 'subcategories', // Include nested subcategories
              required: false,
            },
          ],
        });
      }

      if (withProducts === 'true') {
        include.push({ association: 'products', required: false });
      }

      const category = await Category.findByPk(req.params.id, { include });

      if (!category) {
        return next(new AppError('No category found with that ID', 404));
      }

      // Apply translations if language specified
      if (language) {
        const [translation] = await pool.execute(
          'SELECT * FROM category_translations WHERE category_id = ? AND language_code = ?',
          [req.params.id, language]
        );

        if (translation.length > 0) {
          category.name = translation[0].name || category.name;
          category.description = translation[0].description || category.description;
        }
      }

      res.status(200).json({
        status: 'success',
        data: { category },
      });
    } catch (err) {
      logger.error(`Error getting category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to retrieve category', 500));
    }
  },

  // filepath: c:\Users\romeo\OneDrive\Desktop\mukulah-shop\backend\controllers\CategoryController.js

  addProductsToCategory: async (req, res, next) => {
    try {
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        logger.warn(`Invalid category ID: ${req.params.id}`);
        return next(new AppError('Invalid category ID', 400));
      }

      const { productIds } = req.body;
      if (!Array.isArray(productIds) || productIds.length === 0) {
        logger.warn('Attempt to add products to category with invalid product IDs');
        return next(new AppError('Product IDs must be a non-empty array', 400));
      }

      const category = await Category.findByPk(categoryId);
      if (!category) {
        return next(new AppError('No category found with that ID', 404));
      }

      const products = await Product.findAll({
        where: { id: productIds },
      });

      if (products.length !== productIds.length) {
        logger.warn('Some product IDs are invalid');
        return next(new AppError('Some product IDs are invalid', 400));
      }

      await category.addProducts(products);

      logger.info(`Products added to category with ID: ${categoryId}`);
      res.status(200).json({
        status: 'success',
        message: 'Products added to category successfully',
      });
    } catch (err) {
      logger.error(`Error adding products to category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to add products to category', 500));
    }
  },
  updateCategory: async (req, res, next) => {
    try {
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        logger.warn(`Invalid category ID: ${req.params.id}`);
        return next(new AppError('Invalid category ID', 400));
      }

      // Filter out undefined values from the request body
      const updates = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length === 0) {
        logger.warn('Update attempted with no valid fields');
        return next(new AppError('At least one valid field to update is required', 400));
      }

      logger.debug(`Updating category with ID: ${categoryId}`);
      logger.debug(`Update fields: ${JSON.stringify(updates)}`);

      // Perform the update
      const [updatedRows] = await Category.update(updates, {
        where: { id: categoryId },
      });

      if (updatedRows === 0) {
        logger.warn(`Update failed - category not found with ID: ${categoryId}`);
        return next(new AppError('No category found with that ID', 404));
      }

      const updatedCategory = await Category.findByPk(categoryId);
      if (!updatedCategory) {
        logger.warn(`Update failed - category not found with ID: ${categoryId}`);
        return next(new AppError('No category found with that ID', 404));
      }

      logger.info(`Category updated with ID: ${categoryId}`);
      res.status(200).json({
        status: 'success',
        message: 'Category updated successfully',
        data: {
          category: updatedCategory,
        },
      });
    } catch (err) {
      logger.error(`Error updating category ${req.params.id}: ${err.message}`);
      if (err.message.includes('already exists')) {
        return next(new AppError(err.message, 409));
      }
      next(new AppError('Failed to update category', 500));
    }
  },

  // Update category tree order
  updateCategoryTree: async (req, res, next) => {
    try {
      const { tree } = req.body;

      if (!Array.isArray(tree)) {
        return next(new AppError('Invalid tree structure', 400));
      }

      // You'll need to implement this method to update the nested set model
      await Category.rebuildTree(tree);

      res.status(200).json({
        status: 'success',
        message: 'Category tree updated successfully',
      });
    } catch (err) {
      logger.error(`Error updating category tree: ${err.message}`);
      next(new AppError('Failed to update category tree', 500));
    }
  },

  // Get all top-level categories with their subcategories
  getTopCategories: async (req, res, next) => {
    try {
      const { limit = 20, withChildren = 'false' } = req.query;

      const include = [];
      if (withChildren === 'true') {
        include.push({
          association: 'subcategories',
          required: false,
          include: [
            {
              association: 'subcategories',
              required: false, // Nested subcategories
            },
          ],
        });
      }

      const topCategories = await Category.findAll({
        where: {
          status: 'active',
          parent_id: null, // Only top-level
        },
        order: [['product_count', 'DESC']],
        limit: parseInt(limit),
        include,
      });

      res.status(200).json({
        status: 'success',
        results: topCategories.length,
        data: { categories: topCategories },
      });
    } catch (err) {
      logger.error(`Error getting top categories: ${err.message}`);
      next(new AppError('Failed to retrieve top categories', 500));
    }
  },

  // Get subcategories for a specific category
  getSubcategories: async (req, res, next) => {
    try {
      const category = await Category.findByPk(req.params.id, {
        include: [
          {
            association: 'subcategories',
            where: { status: 'active' },
            required: false,
          },
        ],
      });

      if (!category) {
        return next(new AppError('No category found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          category,
          subcategories: category.subcategories || [],
        },
      });
    } catch (err) {
      logger.error(`Error getting subcategories: ${err.message}`);
      next(new AppError('Failed to retrieve subcategories', 500));
    }
  },

  createSubcategory: async (req, res, next) => {
    try {
      const { name, slug, description, imageUrl } = req.body;
      const parentId = req.params.id;

      if (!name || !slug) {
        return next(new AppError('Name and slug are required', 400));
      }

      if (imageUrl && !isValidUrl(imageUrl)) {
        return next(new AppError('Invalid image URL', 400));
      }

      // Verify parent category exists
      const parentCategory = await Category.findByPk(parentId);
      if (!parentCategory) {
        return next(new AppError('Parent category not found', 404));
      }

      // Create the subcategory
      const subcategory = await Category.create({
        name,
        slug,
        description,
        image_url: imageUrl,
        parent_id: parentId,
        lft: parentCategory.rgt,
        rgt: parentCategory.rgt + 1,
        depth: parentCategory.depth + 1,
      });

      // Update the parent's `lft` and `rgt` values
      await Category.update(
        { rgt: sequelize.literal('rgt + 2') },
        { where: { rgt: { [Op.gte]: parentCategory.rgt } } }
      );
      await Category.update(
        { lft: sequelize.literal('lft + 2') },
        { where: { lft: { [Op.gt]: parentCategory.rgt } } }
      );

      res.status(201).json({
        status: 'success',
        message: 'Subcategory created successfully',
        data: {
          subcategory,
        },
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        console.error('Validation Error:', err.errors);
        return next(new AppError(err.errors.map((e) => e.message).join(', '), 400));
      }
      logger.error(`Error creating subcategory: ${err.message}`);
      next(new AppError('Failed to create subcategory', 500));
    }
  },
  deleteCategory: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const success = await category.delete(req.params.id);

      if (!success) {
        logger.warn(`Delete failed - category not found with ID: ${req.params.id}`);
        return next(new AppError('No category found with that ID', 404));
      }

      logger.info(`Category deleted with ID: ${req.params.id}`);

      res.status(204).json({
        status: 'success',
        message: 'Category deleted successfully',
        data: null,
      });
    } catch (err) {
      logger.error(`Error deleting category ${req.params.id}: ${err.message}`);
      if (err instanceof AppError) {
        return next(err);
      }
      next(new AppError('Failed to delete category', 500));
    }
  },

  // ==================== PRODUCT DISCOVERY ====================

  getCategoryProducts: async (req, res, next) => {
    try {
      const { minPrice, maxPrice, rating, sortBy, limit = 20, offset = 0 } = req.query;

      const filters = {
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        rating: rating ? parseFloat(rating) : null,
        sortBy: ['price_asc', 'price_desc', 'rating', 'newest'].includes(sortBy) ? sortBy : null,
      };

      const category = await Category.findByPk(req.params.id);
      if (!category) {
        return next(new AppError('No category found with that ID', 404));
      }

      const products = await category.getCategoryProducts(filters);

      if (!products.length) {
        logger.warn(`No products found for category ID: ${req.params.id}`);
        return next(new AppError('No products found for this category.', 404));
      }

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products: products.slice(offset, offset + parseInt(limit)),
          pagination: {
            total: products.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
          },
        },
      });
    } catch (err) {
      logger.error(`Error getting products for category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to retrieve category products. Please try again later.', 500));
    }
  },

  getTrendingProducts: async (req, res, next) => {
    try {
      const { limit = 10 } = req.query;

      const category = await Category.findByPk(req.params.id);
      if (!category) {
        return next(new AppError('No category found with that ID', 404));
      }

      const products = await category.getTrendingProducts(parseInt(limit));

      if (!products.length) {
        logger.warn(`No trending products found for category ID: ${req.params.id}`);
        return next(new AppError('No trending products found for this category.', 404));
      }

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products,
        },
      });
    } catch (err) {
      logger.error(`Error getting trending products for category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to retrieve trending products. Please try again later.', 500));
    }
  },

  getDiscountedProducts: async (req, res, next) => {
    try {
      const { limit = 10 } = req.query;
      const category = new Category(pool);
      const products = await category.getDiscountedProducts(req.params.id, parseInt(limit));

      if (!products.length) {
        logger.warn(`No discounted products found for category ID: ${req.params.id}`);
        return next(new AppError('No discounted products found for this category.', 404));
      }

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products,
        },
      });
    } catch (err) {
      logger.error(
        `Error getting discounted products for category ${req.params.id}: ${err.message}`
      );
      next(new AppError('Failed to retrieve discounted products. Please try again later.', 500));
    }
  },

  // ==================== ANALYTICS & METRICS ====================

  getCategoryAnalytics: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const analytics = await category.getCategoryAnalytics(req.params.id);

      if (!analytics) {
        logger.warn(`No analytics data available for category ID: ${req.params.id}`);
        return next(new AppError('No analytics data available for this category.', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          analytics,
        },
      });
    } catch (err) {
      logger.error(`Error getting analytics for category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to retrieve category analytics. Please try again later.', 500));
    }
  },

  getTopLevelCategories: async (req, res, next) => {
    try {
      const { withChildren = 'true', withProducts = 'false' } = req.query;

      const include = [];

      if (withChildren === 'true') {
        include.push({
          association: 'subcategories',
          required: false,
          include: [
            {
              association: 'subcategories',
              required: false,
            },
          ],
        });
      }

      if (withProducts === 'true') {
        include.push({
          association: 'products',
          required: false,
        });
      }

      const categories = await Category.findAll({
        where: {
          parent_id: null,
          status: 'active', // ✅ This is what was missing
        },
        include,
        order: [['lft', 'ASC']],
      });

      logger.debug(
        `Fetched top-level categories: ${JSON.stringify(categories.map((c) => c.name))}`
      );

      res.status(200).json({
        status: 'success',
        data: {
          categories,
        },
      });
    } catch (err) {
      logger.error(`Error getting top-level categories: ${err.message}`);
      next(new AppError('Failed to retrieve categories. Please try again later.', 500));
    }
  },

  moveCategoryToTop: async (req, res, next) => {
    try {
      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        return next(new AppError('Invalid category ID', 400));
      }

      const category = await Category.findByPk(categoryId);
      if (!category) {
        return next(new AppError('Category not found', 404));
      }

      // Promote to top-level category if it's not already
      if (category.parent_id !== null) {
        await category.update({ parent_id: null, depth: 0 });
      }

      // Step 1: Shift all lft & rgt by +2 to make space at the top
      await Category.update({ lft: sequelize.literal('lft + 2') }, { where: {} });
      await Category.update({ rgt: sequelize.literal('rgt + 2') }, { where: {} });

      // Step 2: Move selected category to lft = 1, rgt = 2
      await category.update({ lft: 1, rgt: 2 });

      logger.info(`Category ${categoryId} moved to top`);

      res.status(200).json({
        status: 'success',
        message: 'Category promoted and moved to the top successfully',
        data: { category },
      });
    } catch (err) {
      logger.error(`Failed to move category to top: ${err.message}`);
      next(new AppError('Failed to move category to top', 500));
    }
  },

  getConversionFunnel: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const funnel = await category.getConversionFunnel(req.params.id);

      if (!funnel) {
        logger.warn(`No conversion funnel data available for category ID: ${req.params.id}`);
        return next(new AppError('No conversion funnel data available for this category.', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          funnel,
        },
      });
    } catch (err) {
      logger.error(`Error getting conversion funnel for category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to retrieve conversion funnel. Please try again later.', 500));
    }
  },

  // ==================== PERSONALIZATION & AI ====================

  getPersonalizedCategories: async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        logger.warn('Unauthorized access to personalized categories.');
        return next(
          new AppError('Authentication required to access personalized categories.', 401)
        );
      }

      const category = new Category(pool);
      const recommendations = await category.getPersonalizedCategories(req.user.id);

      if (!recommendations) {
        logger.warn(`No personalized recommendations found for user ID: ${req.user.id}`);
        return next(new AppError('No personalized recommendations found.', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          recommendations,
        },
      });
    } catch (err) {
      logger.error(
        `Error getting personalized categories for user ${req.user?.id}: ${err.message}`
      );
      next(
        new AppError('Failed to retrieve personalized categories. Please try again later.', 500)
      );
    }
  },

  getAICategorySuggestions: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const suggestions = await category.getAICategorySuggestions(req.params.id);

      if (!suggestions.length) {
        logger.warn(`No AI suggestions found for category ID: ${req.params.id}`);
        return next(new AppError('No AI suggestions found for this category.', 404));
      }

      res.status(200).json({
        status: 'success',
        results: suggestions.length,
        data: {
          suggestions,
        },
      });
    } catch (err) {
      logger.error(`Error getting AI suggestions for category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to retrieve AI suggestions. Please try again later.', 500));
    }
  },

  // ==================== VISUAL MERCHANDISING ====================

  setDisplayLayout: async (req, res, next) => {
    try {
      const category = await Category.findByPk(req.params.id);
      if (!category) {
        return next(new AppError('No category found with that ID', 404));
      }

      const { layout } = req.body;
      if (!layout) {
        return next(new AppError('Layout is required', 400));
      }

      await category.setDisplayLayout(layout);

      res.status(200).json({
        status: 'success',
        message: 'Display layout updated successfully',
      });
    } catch (err) {
      logger.error(`Error setting display layout for category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to update display layout', 500));
    }
  },

  addCategoryBanner: async (req, res, next) => {
    try {
      const { imageUrl, title, subtitle, linkUrl, isActive, displayOrder } = req.body;

      if (!imageUrl || !title) {
        return next(new AppError('Image URL and title are required', 400));
      }

      const category = new Category(pool);
      const bannerId = await category.addCategoryBanner(req.params.id, {
        imageUrl,
        title,
        subtitle,
        linkUrl,
        isActive,
        displayOrder,
      });

      res.status(201).json({
        status: 'success',
        message: 'Banner added successfully',
        data: {
          bannerId,
        },
      });
    } catch (err) {
      logger.error(`Error adding banner to category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to add category banner', 500));
    }
  },

  // ==================== INVENTORY MANAGEMENT ====================

  getLowStockProducts: async (req, res, next) => {
    try {
      const { threshold = 5 } = req.query;
      const category = new Category(pool);
      const products = await category.getLowStockProducts(req.params.id, parseInt(threshold));

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products,
        },
      });
    } catch (err) {
      logger.error(
        `Error getting low stock products for category ${req.params.id}: ${err.message}`
      );
      next(new AppError('Failed to retrieve low stock products', 500));
    }
  },

  getInventorySummary: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const summary = await category.getInventorySummary(req.params.id);

      res.status(200).json({
        status: 'success',
        data: {
          summary,
        },
      });
    } catch (err) {
      logger.error(`Error getting inventory summary for category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to retrieve inventory summary', 500));
    }
  },

  // ==================== MULTI-CHANNEL INTEGRATION ====================

  syncCategoryToChannels: async (req, res, next) => {
    try {
      const { channels } = req.body;

      if (!Array.isArray(channels) || channels.length === 0) {
        return next(new AppError('Channels array is required', 400));
      }

      const category = new Category(pool);
      await category.syncCategoryToChannels(req.params.id, channels);

      res.status(200).json({
        status: 'success',
        message: 'Category synced to channels successfully',
      });
    } catch (err) {
      logger.error(`Error syncing category ${req.params.id} to channels: ${err.message}`);
      next(new AppError('Failed to sync category to channels', 500));
    }
  },

  getCrossChannelPerformance: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const performance = await category.getCrossChannelPerformance(req.params.id);

      res.status(200).json({
        status: 'success',
        data: {
          performance,
        },
      });
    } catch (err) {
      logger.error(
        `Error getting cross-channel performance for category ${req.params.id}: ${err.message}`
      );
      next(new AppError('Failed to retrieve cross-channel performance', 500));
    }
  },

  // ==================== SEASONAL & TEMPORAL FEATURES ====================

  setSeasonalAttributes: async (req, res, next) => {
    try {
      const { title, imageUrl, startDate, endDate } = req.body;

      if (!title || !imageUrl || !startDate || !endDate) {
        return next(new AppError('All seasonal attributes are required', 400));
      }

      const category = new Category(pool);
      await category.setSeasonalAttributes(req.params.id, {
        title,
        imageUrl,
        startDate,
        endDate,
      });

      res.status(200).json({
        status: 'success',
        message: 'Seasonal attributes updated successfully',
      });
    } catch (err) {
      logger.error(
        `Error setting seasonal attributes for category ${req.params.id}: ${err.message}`
      );
      next(new AppError('Failed to update seasonal attributes', 500));
    }
  },

  getUpcomingSeasonalCategories: async (req, res, next) => {
    try {
      const { limit = 5 } = req.query;
      const category = new Category(pool);
      const categories = await category.getUpcomingSeasonalCategories(parseInt(limit));

      if (!categories.length) {
        logger.warn('No upcoming seasonal categories found.');
        return next(new AppError('No upcoming seasonal categories found.', 404));
      }

      res.status(200).json({
        status: 'success',
        results: categories.length,
        data: {
          categories,
        },
      });
    } catch (err) {
      logger.error(`Error getting upcoming seasonal categories: ${err.message}`);
      next(
        new AppError(
          'Failed to retrieve upcoming seasonal categories. Please try again later.',
          500
        )
      );
    }
  },

  // ==================== BULK OPERATIONS ====================

  bulkUpdateCategories: async (req, res, next) => {
    try {
      const updates = req.body; // Expecting an array of updates
      if (!Array.isArray(updates) || updates.length === 0) {
        logger.warn('Bulk update attempted with invalid or empty payload');
        return next(new AppError('Invalid or empty payload for bulk update', 400));
      }

      const updatePromises = updates.map(async (update) => {
        const { id, ...fields } = update;
        if (!id) {
          throw new AppError('Each update must include a valid category ID', 400);
        }
        return Category.update(fields, { where: { id } });
      });

      await Promise.all(updatePromises);

      logger.info('Bulk update completed successfully');
      res.status(200).json({
        status: 'success',
        message: 'Categories updated successfully',
      });
    } catch (err) {
      logger.error(`Error during bulk update: ${err.message}`);
      next(new AppError('Failed to perform bulk update', 500));
    }
  },

  bulkUpdateStatus: async (req, res, next) => {
    try {
      const { categoryIds, status } = req.body;

      if (
        !Array.isArray(categoryIds) ||
        categoryIds.length === 0 ||
        !['active', 'inactive'].includes(status)
      ) {
        return next(new AppError('Valid categoryIds array and status are required', 400));
      }

      const category = new Category(pool);
      const updatedCount = await category.bulkUpdateStatus(categoryIds, status);

      res.status(200).json({
        status: 'success',
        message: `${updatedCount} categories status updated`,
        data: {
          updatedCount,
        },
      });
    } catch (err) {
      logger.error(`Error in bulk status update: ${err.message}`);
      next(new AppError('Failed to perform bulk status update', 500));
    }
  },

  // ==================== CATEGORY RELATIONSHIPS ====================

  getComplementaryCategories: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const categories = await category.getComplementaryCategories(req.params.id);

      res.status(200).json({
        status: 'success',
        results: categories.length,
        data: {
          categories,
        },
      });
    } catch (err) {
      logger.error(`Error getting complementary categories for ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to retrieve complementary categories', 500));
    }
  },

  getFrequentlyBoughtTogether: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const categories = await category.getFrequentlyBoughtTogether(req.params.id);

      res.status(200).json({
        status: 'success',
        results: categories.length,
        data: {
          categories,
        },
      });
    } catch (err) {
      logger.error(
        `Error getting frequently bought together categories for ${req.params.id}: ${err.message}`
      );
      next(new AppError('Failed to retrieve frequently bought together categories', 500));
    }
  },

  // ==================== LOCALIZATION & INTERNATIONALIZATION ====================

  addTranslation: async (req, res, next) => {
    try {
      const { languageCode, name, description, metaTitle, metaDescription, metaKeywords } =
        req.body;

      if (!languageCode || !name) {
        return next(new AppError('Language code and name are required', 400));
      }

      const category = new Category(pool);
      await category.addTranslation(req.params.id, {
        languageCode,
        name,
        description,
        metaTitle,
        metaDescription,
        metaKeywords,
      });

      res.status(201).json({
        status: 'success',
        message: 'Translation added successfully',
      });
    } catch (err) {
      logger.error(`Error adding translation to category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to add translation', 500));
    }
  },

  // ==================== VERSIONING & HISTORY ====================

  getCategoryHistory: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const history = await category.getCategoryHistory(req.params.id);

      res.status(200).json({
        status: 'success',
        data: {
          history,
        },
      });
    } catch (err) {
      logger.error(`Error getting category history for ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to retrieve category history', 500));
    }
  },

  getEngagementMetrics: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const metrics = await category.getEngagementMetrics(req.params.id);

      res.status(200).json({
        status: 'success',
        data: {
          metrics,
        },
      });
    } catch (err) {
      logger.error(
        `Error getting engagement metrics for category ${req.params.id}: ${err.message}`
      );
      next(new AppError('Failed to retrieve engagement metrics', 500));
    }
  },

  deleteCategoryBanner: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const success = await category.deleteCategoryBanner(req.params.bannerId);

      if (!success) {
        logger.warn(`Delete failed - banner not found with ID: ${req.params.bannerId}`);
        return next(new AppError('No banner found with that ID', 404));
      }

      logger.info(`Banner deleted with ID: ${req.params.bannerId}`);

      res.status(204).json({
        status: 'success',
        message: 'Banner deleted successfully',
        data: null,
      });
    } catch (err) {
      logger.error(`Error deleting banner ${req.params.bannerId}: ${err.message}`);
      next(new AppError('Failed to delete banner', 500));
    }
  },
  removeProductsFromCategory: async (req, res, next) => {
    try {
      const { productIds } = req.body;

      if (!Array.isArray(productIds)) {
        return next(new AppError('Product IDs array is required', 400));
      }

      const category = new Category(pool);
      const removedCount = await category.removeProductsFromCategory(req.params.id, productIds);

      res.status(200).json({
        status: 'success',
        message: `${removedCount} products removed from category`,
        data: {
          removedCount,
        },
      });
    } catch (err) {
      logger.error(`Error removing products from category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to remove products from category', 500));
    }
  },
};

module.exports = categoryController;
