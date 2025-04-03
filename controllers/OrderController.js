const Order = require('../models/OrderModel');
const Cart = require('../models/CartModel');

exports.createOrder = async (req, res, next) => {
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

    // Prepare order items
    const orderItems = cartItems.map((item) => ({
      productId: item.product_id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
      size: item.size,
      color: item.color,
    }));

    // Create order
    const orderId = await Order.create(userId, {
      shippingAddress,
      paymentMethod,
      items: orderItems,
      totalPrice,
    });

    // Get full order details
    const order = await Order.findById(orderId);
    const items = await Order.getItems(orderId);

    // Clear cart
    await Cart.clear(cart.id);

    res.status(201).json({
      success: true,
      data: {
        ...order,
        items,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.findByUser(req.user.id);
    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await Order.updateStatus(id, status);

    res.json({
      success: true,
      message: 'Order status updated',
    });
  } catch (error) {
    next(error);
  }
};
