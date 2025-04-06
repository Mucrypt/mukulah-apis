const Checkout = require('../models/CheckoutModel');
const Cart = require('../models/CartModel');
const { pool } = require('../config/db');
const { getUserId } = require('../middleware/auth'); // Adjust the path as necessary
const stripe = require('../config/stripe'); // Ensure Stripe is configured
const Order = require('../models/OrderModel'); // Import the Order model

exports.processCheckout = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    const userId = req.user.id;

    // Get user's cart
    const cart = await Cart.findByUser(userId);
    if (!cart) {
      return res.status(400).json({
        success: false,
        message: 'No cart found',
      });
    }

    const cartItems = await Cart.getItems(cart.id);
    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    // Verify stock availability
    for (const item of cartItems) {
      const [products] = await pool.execute(
        'SELECT stock_quantity, stock_status FROM products WHERE id = ?',
        [item.product_id]
      );
      const product = products[0];

      if (product.stock_status !== 'in_stock' || product.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.name} is not available in the requested quantity`,
        });
      }
    }

    // Calculate total price
    const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

    // Prepare checkout items
    const checkoutItems = cartItems.map((item) => ({
      productId: item.product_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      size: item.size,
      color: item.color,
    }));

    // Process checkout
    const checkoutId = await Checkout.create(userId, {
      shippingAddress,
      paymentMethod,
      items: checkoutItems,
      totalPrice,
    });

    // Get full checkout details
    const checkout = await Checkout.getCheckoutWithItems(checkoutId);

    // Clear cart
    await Cart.clear(cart.id);

    res.status(201).json({
      success: true,
      data: checkout,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCheckoutDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const checkout = await Checkout.getCheckoutWithItems(id);

    if (!checkout) {
      return res.status(404).json({
        success: false,
        message: 'Checkout not found',
      });
    }

    // Verify ownership (ensure both are strings for comparison)
    if (String(checkout.user_id) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this checkout',
      });
    }

    res.json({
      success: true,
      data: checkout,
    });
  } catch (error) {
    next(error);
  }
};

exports.getShippingOptions = async (req, res, next) => {
  try {
    const shippingOptions = [
      { id: 'standard', name: 'Standard Shipping', price: 5.99, estimated_days: 5 },
      { id: 'express', name: 'Express Shipping', price: 15.99, estimated_days: 2 },
      { id: 'overnight', name: 'Overnight Shipping', price: 25.99, estimated_days: 1 },
    ];

    res.status(200).json({
      success: true,
      data: shippingOptions,
    });
  } catch (error) {
    console.error('Error fetching shipping options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipping options',
    });
  }
};

exports.validatePayment = async (req, res, next) => {
  try {
    const { checkoutId, paymentMethodToken } = req.body;

    // Validate required fields
    if (!checkoutId) {
      return res.status(400).json({
        success: false,
        message: 'Checkout ID is required',
      });
    }

    if (!paymentMethodToken) {
      console.error(
        'Payment method token is missing. Ensure you are using Stripe.js or Stripe Elements.'
      );
      return res.status(400).json({
        success: false,
        message:
          'Payment method token is required. Use Stripe.js or Stripe Elements to generate it.',
      });
    }

    const checkout = await Checkout.getCheckoutWithItems(checkoutId);
    if (!checkout) {
      return res.status(404).json({
        success: false,
        message: 'Checkout not found',
      });
    }

    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: checkout.total_price * 100, // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodToken,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Disable redirects
      },
      metadata: { checkoutId: checkout.id, userId: checkout.user_id },
    });

    // Map checkout items to match the expected structure in Order.create
    const orderItems = checkout.items.map((item) => ({
      productId: item.product_id, // Map product_id to productId
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
      size: item.size,
      color: item.color,
    }));

    // Create an order in the database
    const orderId = await Order.create(checkout.user_id, {
      shippingAddress: {
        address: checkout.shipping_address,
        city: checkout.shipping_city,
        postalCode: checkout.shipping_postal_code,
        country: checkout.shipping_country,
      },
      paymentMethod: checkout.payment_method,
      items: orderItems, // Pass the mapped items
      totalPrice: checkout.total_price,
    });

    // Update payment status in the database
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE checkouts SET payment_status = ?, is_paid = ?, payment_details = ? WHERE id = ?`,
        ['paid', 1, JSON.stringify(paymentIntent), checkoutId]
      );
      res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        paymentIntent,
        orderId, // Include the created order ID in the response
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error validating payment:', error);

    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to validate payment',
    });
  }
};
