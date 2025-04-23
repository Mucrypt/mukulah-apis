const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/CategoryController');
const auth = require('../middleware/auth');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// ==================== PUBLIC ROUTES ====================

// General listings and top categories
router.get('/', cacheMiddleware(300), categoryController.getCategoryTree);
router.get('/localized/:language', cacheMiddleware(300), categoryController.getCategoryTree);
router.get('/top-level', categoryController.getTopLevelCategories);
router.patch('/:id/move-to-top', categoryController.moveCategoryToTop);

router.get('/analytics/top', cacheMiddleware(300), categoryController.getTopCategories);
router.get(
  '/seasonal/upcoming',
  cacheMiddleware(300),
  categoryController.getUpcomingSeasonalCategories
);

// Relationships and insights
router.get('/:id/subcategories', cacheMiddleware(300), categoryController.getSubcategories);
router.get('/:id/products', cacheMiddleware(60), categoryController.getCategoryProducts);
router.get('/:id/products/trending', cacheMiddleware(60), categoryController.getTrendingProducts);
router.get(
  '/:id/products/discounted',
  cacheMiddleware(60),
  categoryController.getDiscountedProducts
);
router.get('/:id/products/low-stock', cacheMiddleware(60), categoryController.getLowStockProducts);
router.get('/:id/analytics', cacheMiddleware(300), categoryController.getCategoryAnalytics);
router.get('/:id/conversion-funnel', cacheMiddleware(300), categoryController.getConversionFunnel);
router.get('/:id/engagement', cacheMiddleware(300), categoryController.getEngagementMetrics);
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


router.post('/rebuild-tree', categoryController.rebuildCategoryTree);

// Single category access (should be LAST public route to avoid route conflict)
router.get('/:id', cacheMiddleware(300), categoryController.getCategory);

// ==================== AUTHENTICATED ROUTES ====================
router.use(auth.authenticate);

// Personalization
router.get('/personalized/recommendations', categoryController.getPersonalizedCategories);

// ==================== ADMIN ROUTES ====================
router.use(auth.authorize('admin', 'superAdmin'));


// Bulk operations
router.patch('/bulk', categoryController.bulkUpdateCategories);
router.patch('/bulk-status', categoryController.bulkUpdateStatus);

// Core CRUD
router.post('/', categoryController.createCategory);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

// Admin subcategory creation and tree updates
router.post('/:id/subcategories', categoryController.createSubcategory);
router.patch('/tree/update', categoryController.updateCategoryTree);

// Bulk operations
router.patch('/bulk', categoryController.bulkUpdateCategories);
router.patch('/bulk-status', categoryController.bulkUpdateStatus);

// Visual merchandising
router.patch('/:id/display', categoryController.setDisplayLayout);
router.post('/:id/banners', categoryController.addCategoryBanner);
router.delete('/:id/banners/:bannerId', categoryController.deleteCategoryBanner);

// Product/category management
router.post('/:id/add-products', categoryController.addProductsToCategory);
router.delete('/:id/products/batch', categoryController.removeProductsFromCategory);

// Multi-channel sync
router.post('/:id/sync', categoryController.syncCategoryToChannels);

// Seasonal attributes
router.patch('/:id/seasonal', categoryController.setSeasonalAttributes);

// Localization
router.post('/:id/translations', categoryController.addTranslation);

// Versioning
router.get('/:id/history', categoryController.getCategoryHistory);
// router.post('/:id/rollback', categoryController.rollbackCategoryVersion);

// AI suggestions
router.get('/:id/suggestions', categoryController.getAICategorySuggestions);

module.exports = router;
