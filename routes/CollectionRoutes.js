const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/CollectionController');
const auth = require('../middleware/auth');

// Public routes (read-only)
router.get('/', collectionController.getAllCollections);
router.get('/category/:categoryId', collectionController.getCollectionsByCategory);
router.get('/:id', collectionController.getCollection);
router.get('/:id/products', collectionController.getCollectionProducts);

// Protected routes (require authentication)
router.use(auth.authenticate);

// Admin routes (require admin role)
router.use(auth.authorize('admin', 'superAdmin'));

// Collection CRUD
router.post('/', collectionController.createCollection);
router.post('/bulk', collectionController.bulkCreateCollections);
router.patch('/:id', collectionController.updateCollection);
router.patch('/bulk', collectionController.bulkUpdateCollections);
router.delete('/:id', collectionController.deleteCollection);

// Collection Visibility
router.patch('/:id/feature', collectionController.toggleFeaturedStatus);
router.patch('/:id/status', collectionController.updateStatus);

// Product Operations
router.post('/:id/add-products', collectionController.addProductsToCollection);
router.delete('/:id/products/batch', collectionController.removeProductsFromCollection);
router.put('/:id/products', collectionController.replaceCollectionProducts);
router.patch('/:id/products/positions', collectionController.updateProductPositions);

// Analytics
router.get('/:id/analytics', collectionController.getCollectionAnalytics);
router.get('/analytics/top', collectionController.getTopCollections);

module.exports = router;
