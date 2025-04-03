const Cart = require('../models/CartModel');
const Product = require('../models/ProductModel');

exports.getCart = async (req, res, next) => {
  try {
    let cart;
    if (req.user) {
      cart = await Cart.findByUser(req.user.id);
    } else if (req.cookies.guestId) {
      cart = await Cart.findByGuest(req.cookies.guestId);
    }

    if (!cart) {
      // Create new cart if doesn't exist
      const cartId = await Cart.create(
        req.user?.id,
        req.user ? null : req.cookies.guestId || generateGuestId()
      );
      cart = { id: cartId, items: [] };
    } else {
      cart.items = await Cart.getItems(cart.id);
    }

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify stock
    if (product.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
      });
    }

    // Get or create cart
    let cart;
    if (req.user) {
      cart = (await Cart.findByUser(req.user.id)) || (await Cart.create(req.user.id, null));
    } else {
      const guestId = req.cookies.guestId || generateGuestId();
      cart = (await Cart.findByGuest(guestId)) || (await Cart.create(null, guestId));
      res.cookie('guestId', guestId, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
      });
    }

    // Add to cart
    await Cart.addItem(cart.id, productId, {
      name: product.name,
      image: product.image,
      price: product.price,
      quantity,
      size: req.body.size,
      color: req.body.color,
    });

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1',
      });
    }

    // Get cart
    let cart;
    if (req.user) {
      cart = await Cart.findByUser(req.user.id);
    } else if (req.cookies.guestId) {
      cart = await Cart.findByGuest(req.cookies.guestId);
    }

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    // Verify item exists in cart
    const [items] = await pool.execute(
      'SELECT * FROM cart_items WHERE id = ? AND cart_id = ? LIMIT 1',
      [itemId, cart.id]
    );

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart',
      });
    }

    // Check stock
    const product = await Product.findById(items[0].product_id);
    if (product.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
      });
    }

    // Update quantity
    await Cart.updateItemQuantity(cart.id, itemId, quantity);

    res.json({
      success: true,
      message: 'Cart updated',
    });
  } catch (error) {
    next(error);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    // Get cart
    let cart;
    if (req.user) {
      cart = await Cart.findByUser(req.user.id);
    } else if (req.cookies.guestId) {
      cart = await Cart.findByGuest(req.cookies.guestId);
    }

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    // Remove item
    await Cart.removeItem(cart.id, itemId);

    res.json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (error) {
    next(error);
  }
};

// Helper function
function generateGuestId() {
  return require('crypto').randomBytes(16).toString('hex');
}
