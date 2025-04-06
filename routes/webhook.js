// routes/webhook.js
const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const bodyParser = require('body-parser');
const Checkout = require('../models/CheckoutModel');
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

    // Mark as paid in DB
    await Checkout.markAsPaid(checkoutId, {
      payment_status: 'paid',
      payment_details: session.payment_intent,
      paid_at: new Date(),
    });

    // Send email confirmation (next step 👇)
    const checkout = await Checkout.findById(checkoutId);
    if (checkout) {
      const orderData = {
        id: checkout._id,
        items: checkout.items,
        total: checkout.total,
      };
      await sendOrderConfirmation(checkout.email, orderData);
    } else {
      console.error('Checkout not found:', checkoutId);
    }
  }

  res.status(200).json({ received: true });
});

module.exports = router;
