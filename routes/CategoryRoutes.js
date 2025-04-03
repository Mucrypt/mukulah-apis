const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/CategoryController');
const auth = require('../middleware/auth');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// ==================== PUBLIC ROUTES ====================

// Category tree and listing
router.get('/', cacheMiddleware(300), categoryController.getCategoryTree);
router.get('/localized/:language', cacheMiddleware(300), categoryController.getCategoryTree);

// Single category access
router.get('/:id', cacheMiddleware(300), categoryController.getCategory);
router.get('/:id/products', cacheMiddleware(60), categoryController.getCategoryProducts);

// Product discovery
router.get('/:id/products/trending', cacheMiddleware(60), categoryController.getTrendingProducts);
router.get(
  '/:id/products/discounted',
  cacheMiddleware(60),
  categoryController.getDiscountedProducts
);
router.get('/:id/products/low-stock', cacheMiddleware(60), categoryController.getLowStockProducts);

// Analytics and insights
router.get('/:id/analytics', cacheMiddleware(300), categoryController.getCategoryAnalytics);
router.get('/analytics/top', cacheMiddleware(300), categoryController.getTopCategories);
router.get('/:id/conversion-funnel', cacheMiddleware(300), categoryController.getConversionFunnel);
router.get('/:id/engagement', cacheMiddleware(300), categoryController.getEngagementMetrics);

// Category relationships
router.get(
  '/:id/complementary',
  cacheMiddleware(300),
  categoryController.getComplementaryCategories
);
router.get(
  '/:id/frequently-bought',
  cacheMiddleware(300),
  categoryController.getFrequentlyBoughtTogether
);

// Seasonal features
router.get(
  '/seasonal/upcoming',
  cacheMiddleware(300),
  categoryController.getUpcomingSeasonalCategories
);

// ==================== AUTHENTICATED ROUTES ====================
router.use(auth.authenticate);

// Personalization
router.get('/personalized/recommendations', categoryController.getPersonalizedCategories);

// ==================== ADMIN ROUTES ====================
router.use(auth.authorize('admin', 'superAdmin'));

// Core CRUD operations
router.post('/', categoryController.createCategory);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

// Bulk operations
router.patch('/bulk', categoryController.bulkUpdateCategories);
router.patch('/bulk-status', categoryController.bulkUpdateStatus);

// Visual merchandising
router.patch('/:id/display', categoryController.setDisplayLayout);
router.post('/:id/banners', categoryController.addCategoryBanner);
router.delete('/:id/banners/:bannerId', categoryController.deleteCategoryBanner);

// Product operations
router.post('/:id/add-products', categoryController.addProductsToCategory);
router.delete('/:id/products/batch', categoryController.removeProductsFromCategory);

// Multi-channel integration
router.post('/:id/sync', categoryController.syncCategoryToChannels);

// Seasonal features
router.patch('/:id/seasonal', categoryController.setSeasonalAttributes);

// Localization
router.post('/:id/translations', categoryController.addTranslation);

// Versioning
router.get('/:id/history', categoryController.getCategoryHistory);
//router.post('/:id/rollback', categoryController.rollbackCategoryVersion);

// AI features
router.get('/:id/suggestions', categoryController.getAICategorySuggestions);

module.exports = router;
