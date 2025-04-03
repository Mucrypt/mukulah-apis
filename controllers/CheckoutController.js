const Checkout = require('../models/CheckoutModel');
const Cart = require('../models/CartModel');

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

    // Verify ownership
    if (checkout.user_id !== req.user.id) {
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
