const express = require('express');
const router = express.Router();
const inventoryController = require('../../controllers/sellersController/sellerInventoryController');
const auth = require('../../middleware/auth');

router.patch('/products/:id/adjust-stock', auth.onlySeller, inventoryController.adjustStock);
router.get('/inventory/overview', auth.onlySeller, inventoryController.getInventoryOverview);
router.get('/inventory/history', auth.onlySeller, inventoryController.getStockAdjustmentHistory);

module.exports = router;
