const Category = require('../models/CategoryModel');
const { pool } = require('../config/db');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const categoryController = {
  // ==================== CORE CRUD OPERATIONS ====================

  createCategory: async (req, res, next) => {
    try {
      const { name, slug, description, imageUrl, parentId } = req.body;

      if (!name || !slug) {
        logger.warn('Category creation attempted with missing required fields');
        return next(new AppError('Name and slug are required', 400));
      }

      const category = new Category(pool);
      const categoryId = await category.create({
        name,
        slug,
        description,
        imageUrl,
        parentId,
      });

      logger.info(`Category created with ID: ${categoryId}`);

      res.status(201).json({
        status: 'success',
        message: 'Category created successfully',
        data: {
          categoryId: categoryId, // Make sure this is included
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

      const tree = language
        ? await category.getLocalizedCategoryTree(language)
        : await category.getFullTree();

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

  getCategory: async (req, res, next) => {
    try {
      const {
        withChildren = 'false',
        withProducts = 'false',
        withAnalytics = 'false',
        language,
      } = req.query;

      const category = new Category(pool);
      const categoryData = await category.findById(
        req.params.id,
        withChildren === 'true',
        withProducts === 'true',
        withAnalytics === 'true'
      );

      if (!categoryData) {
        logger.warn(`Category not found with ID: ${req.params.id}`);
        return next(new AppError('No category found with that ID', 404));
      }

      // Apply translations if language specified
      if (language) {
        const [translation] = await pool.execute(
          'SELECT * FROM category_translations WHERE category_id = ? AND language_code = ?',
          [req.params.id, language]
        );
        if (translation.length > 0) {
          categoryData.name = translation[0].name || categoryData.name;
          categoryData.description = translation[0].description || categoryData.description;
        }
      }

      res.status(200).json({
        status: 'success',
        data: {
          category: categoryData,
        },
      });
    } catch (err) {
      logger.error(`Error getting category ${req.params.id}: ${err.message}`);
      if (err instanceof AppError) {
        return next(err);
      }
      next(new AppError('Failed to retrieve category', 500));
    }
  },

  addProductsToCategory: async (req, res, next) => {
    try {
      const { productIds } = req.body;

      if (!Array.isArray(productIds)) {
        logger.warn('Attempt to add products to category with invalid product IDs');
        return next(new AppError('Product IDs array is required', 400));
      }

      const category = new Category(pool);
      const addedCount = await category.addProductsToCategory(req.params.id, productIds);

      logger.info(`Added ${addedCount} products to category ${req.params.id}`);

      res.status(200).json({
        status: 'success',
        message: `${addedCount} products added to category`,
        data: {
          addedCount,
        },
      });
    } catch (err) {
      logger.error(`Error adding products to category ${req.params.id}: ${err.message}`);
      next(new AppError('Failed to add products to category', 500));
    }
  },

 
  updateCategory: async (req, res, next) => {
    try {
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

      logger.debug(`Updating category with ID: ${req.params.id}`);
      logger.debug(`Update fields: ${JSON.stringify(updates)}`);

      const category = new Category(pool);
      const updatedRows = await category.update(req.params.id, updates);

      if (updatedRows === 0) {
        logger.warn(`Update failed - category not found with ID: ${req.params.id}`);
        return next(new AppError('No category found with that ID', 404));
      }

      const updatedCategory = await category.findById(req.params.id);
      if (!updatedCategory) {
        logger.warn(`Update failed - category not found with ID: ${req.params.id}`);
        return next(new AppError('No category found with that ID', 404));
      }

      logger.info(`Category updated with ID: ${req.params.id}`);
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

      const category = new Category(pool);
      const products = await category.getCategoryProducts(req.params.id, filters);

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
      const category = new Category(pool);
      const products = await category.getTrendingProducts(req.params.id, parseInt(limit));

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

  getTopCategories: async (req, res, next) => {
    try {
      const { limit = 10 } = req.query;
      const category = new Category(pool);
      const categories = await category.getTopCategories(parseInt(limit));

      if (!categories.length) {
        logger.warn('No top categories found.');
        return next(new AppError('No top categories found.', 404));
      }

      res.status(200).json({
        status: 'success',
        results: categories.length,
        data: {
          categories,
        },
      });
    } catch (err) {
      logger.error(`Error getting top categories: ${err.message}`);
      next(new AppError('Failed to retrieve top categories. Please try again later.', 500));
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
      const { layout } = req.body;
      if (!['grid', 'list', 'carousel'].includes(layout)) {
        return next(new AppError('Invalid layout type', 400));
      }

      const category = new Category(pool);
      await category.setDisplayLayout(req.params.id, layout);

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
      if (!Array.isArray(req.body) || req.body.length === 0) {
        return next(new AppError('Request body must be a non-empty array', 400));
      }

      const category = new Category(pool);
      const updatedCount = await category.bulkUpdateCategories(req.body);

      res.status(200).json({
        status: 'success',
        message: `${updatedCount} categories updated successfully`,
        data: {
          updatedCount,
        },
      });
    } catch (err) {
      logger.error(`Error in bulk category update: ${err.message}`);
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
