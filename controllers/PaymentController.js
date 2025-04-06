// controllers/PaymentController.js
const stripe = require('../config/stripe');
const Checkout = require('../models/CheckoutModel');

exports.createStripeSession = async (req, res, next) => {
  try {
    const { checkoutId } = req.body;

    const checkout = await Checkout.getCheckoutWithItems(checkoutId);
    if (!checkout) {
      return res.status(404).json({ success: false, message: 'Checkout not found' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: checkout.items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: [item.image],
          },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      })),
      success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`,
      metadata: { checkoutId: checkout.id, userId: checkout.user_id },
    });

    res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    next(error);
  }
};
