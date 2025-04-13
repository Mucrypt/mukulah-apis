// routes/sellerEarningsRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const earningsController = require('../../controllers/sellersController/sellerEarningsController');
const stripePayoutController = require('../../controllers/stripePayoutController'); // Add this line

// Earnings summary + breakdown
router.get('/earnings', auth.onlySeller, earningsController.getEarningsOverview);

// All payouts overview
router.get('/payouts', auth.onlySeller, earningsController.getAllPayouts);

// Specific payout details
router.get('/payouts/:id', auth.onlySeller, earningsController.getPayoutDetail);

// Payouts sync with Stripe
router.get('/payouts/sync', auth.onlySeller, stripePayoutController.syncPayouts);

module.exports = router;
