const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const auth = require('../middleware/auth');

// Public routes (read-only)
router.get('/', brandController.getAllBrands);
router.get('/:id', brandController.getBrand);
router.get('/:id/products', brandController.getBrandProducts);

// Protected routes (require authentication)
router.use(auth.authenticate);

// Admin routes (require admin role)
router.use(auth.authorize('admin', 'superAdmin'));

router.post('/', brandController.createBrand);
router.patch('/:id', brandController.updateBrand);
router.delete('/:id', brandController.deleteBrand);

module.exports = router;
