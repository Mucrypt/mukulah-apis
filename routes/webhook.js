// routes/webhook.js
const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const bodyParser = require('body-parser');
const Checkout = require('../models/entities/Checkout');
const { sendOrderConfirmation } = require('../services/emailService');

router.post('/stripe', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const checkoutId = session.metadata.checkoutId;

    await Checkout.update(
      {
        is_paid: true,
        paid_at: new Date(),
        payment_status: 'paid',
        payment_details: session,
      },
      { where: { id: checkoutId } }
    );

    const checkout = await Checkout.findByPk(checkoutId);
    if (checkout) {
      await sendOrderConfirmation(checkout.email, {
        id: checkout.id,
        total: checkout.total_price,
      });
    }
  }

  // Handle refund
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const checkoutId = charge.metadata?.checkoutId;

    if (checkoutId) {
      await Checkout.update(
        {
          payment_status: 'refunded',
          payment_details: charge,
        },
        { where: { id: checkoutId } }
      );

      console.log(`✅ Checkout ${checkoutId} marked as refunded.`);
    } else {
      console.warn('⚠️ Missing checkoutId in charge.metadata');
    }
  }

  res.status(200).json({ received: true });
});

module.exports = router;
