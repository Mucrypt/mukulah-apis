// controllers/stripePayoutController.js
const stripe = require('../config/stripe');
const Payout = require('../models/entities/Payout');
const Seller = require('../models/entities/Seller');
const AppError = require('../utils/appError');

const stripePayoutController = {
  // GET /seller/payouts/sync
  syncPayouts: async (req, res, next) => {
    try {
      const seller = await Seller.findByPk(req.user.id);
      if (!seller || !seller.stripe_account_id) {
        return next(new AppError('Stripe account not connected', 400));
      }

      const payouts = await stripe.payouts.list({
        limit: 100,
        stripeAccount: seller.stripe_account_id,
      });

      const stored = [];
      for (let payout of payouts.data) {
        const [record, created] = await Payout.findOrCreate({
          where: { stripe_payout_id: payout.id },
          defaults: {
            seller_id: seller.id,
            amount: payout.amount / 100,
            currency: payout.currency,
            arrival_date: new Date(payout.arrival_date * 1000),
            status: payout.status,
            stripe_payout_id: payout.id,
            metadata: payout,
          },
        });
        stored.push({ id: record.id, new: created });
      }

      res.status(200).json({ status: 'success', synced: stored });
    } catch (err) {
      console.error('Stripe payout sync failed:', err);
      next(new AppError('Failed to sync payouts', 500));
    }
  },
};

module.exports = stripePayoutController;
