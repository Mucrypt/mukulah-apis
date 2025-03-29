const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
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

router.post('/', collectionController.createCollection);
router.patch('/:id', collectionController.updateCollection);
router.delete('/:id', collectionController.deleteCollection);

module.exports = router;
