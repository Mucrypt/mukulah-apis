const Cart = require('../models/CartModel');
const { pool } = require('../config/db');

// Helper function for cookie options
const cookieOptions = () => ({
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
});

// Generate unique guest ID
const generateGuestId = () => require('crypto').randomBytes(16).toString('hex');

exports.getCart = async (req, res) => {
  try {
    let cart;
    let isNewCart = false;

    // For authenticated users
    if (req.user) {
      cart = await Cart.findByUser(req.user.id);

      // If no cart exists but there's a guest cart, merge them
      if (!cart && req.cookies?.guestId) {
        const guestCart = await Cart.findByGuest(req.cookies.guestId);
        if (guestCart) {
          cart = await Cart.mergeCarts(req.user.id, guestCart.id);
          res.clearCookie('guestId');
        }
      }
    }
    // For guests
    else {
      const guestId = req.cookies?.guestId || generateGuestId();
      cart = await Cart.findByGuest(guestId);

      // Set cookie if it didn't exist
      if (!req.cookies?.guestId) {
        res.cookie('guestId', guestId, cookieOptions());
      }
    }

    // Create new cart if doesn't exist
    if (!cart) {
      const cartId = await Cart.create(
        req.user?.id,
        req.user ? null : req.cookies?.guestId || generateGuestId()
      );
      cart = { id: cartId, items: [], total_price: 0 };
      isNewCart = true;
    } else {
      // Fetch cart items
      cart.items = await Cart.getItems(cart.id); // Ensure items are fetched
    }

    res.status(200).json({
      status: 'success',
      message: isNewCart ? 'New cart created' : 'Cart retrieved successfully',
      data: {
        cart,
        metadata: {
          item_count: cart.items.length, // Correctly calculate item count
          is_guest: !req.user,
          is_new: isNewCart,
        },
      },
    });
  } catch (error) {
    console.error('Cart retrieval error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve shopping cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, size = null, color = null } = req.body;

    // Validate input
    if (!productId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Product ID is required',
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        status: 'fail',
        message: 'Quantity must be a positive integer',
      });
    }

    // Get or create cart
    let cart;
    if (req.user) {
      cart = (await Cart.findByUser(req.user.id)) || (await Cart.create(req.user.id, null));
    } else {
      const guestId = req.cookies?.guestId || generateGuestId();
      cart = (await Cart.findByGuest(guestId)) || (await Cart.create(null, guestId));
      if (!req.cookies?.guestId) {
        res.cookie('guestId', guestId, cookieOptions());
      }
    }

    // Add item to cart
    await Cart.addItem(cart.id, productId, { quantity, size, color });

    // Fetch updated cart
    const updatedCart = await Cart.findByUserOrGuest(req.user?.id, req.cookies?.guestId);
    updatedCart.items = await Cart.getItems(updatedCart.id);

    res.status(201).json({
      status: 'success',
      message: 'Item added to cart successfully',
      data: {
        cart: updatedCart,
        added_item: {
          productId,
          quantity,
          size,
          color,
        },
      },
    });
  } catch (error) {
    console.error('Add to cart error:', error);

    const status = error.message.includes('available in stock') ? 400 : 500;
    const message = status === 400 ? error.message : 'Failed to add item to cart';

    res.status(status).json({
      status: 'error',
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    // Validate input
    if (!quantity || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Quantity must be a positive integer or zero to remove',
      });
    }

    // Get cart
    let cart;
    if (req.user) {
      cart = await Cart.findByUser(req.user.id);
    } else if (req.cookies?.guestId) {
      cart = await Cart.findByGuest(req.cookies.guestId);
    }

    if (!cart) {
      return res.status(404).json({
        status: 'fail',
        message: 'Cart not found',
      });
    }

    // Update item quantity
    await Cart.updateItemQuantity(cart.id, itemId, quantity);

    // Get updated cart
    const updatedCart = await Cart.findByUserOrGuest(req.user?.id, req.cookies?.guestId);
    updatedCart.items = await Cart.getItems(updatedCart.id);

    res.status(200).json({
      status: 'success',
      message: quantity === 0 ? 'Item removed from cart' : 'Cart item updated',
      data: {
        cart: updatedCart,
        updated_item: {
          itemId,
          newQuantity: quantity,
        },
      },
    });
  } catch (error) {
    console.error('Update cart item error:', error);

    const status = error.message.includes('available in stock')
      ? 400
      : error.message.includes('not found')
        ? 404
        : 500;

    res.status(status).json({
      status: 'error',
      message: error.message || 'Failed to update cart item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    // Get cart
    let cart;
    if (req.user) {
      cart = await Cart.findByUser(req.user.id);
    } else if (req.cookies?.guestId) {
      cart = await Cart.findByGuest(req.cookies.guestId);
    }

    if (!cart) {
      return res.status(404).json({
        status: 'fail',
        message: 'Cart not found',
      });
    }

    // Remove item
    await Cart.removeItem(cart.id, itemId);

    // Check if cart still exists (might be deleted if empty)
    let updatedCart;
    try {
      updatedCart = await Cart.findByUserOrGuest(req.user?.id, req.cookies?.guestId);
      if (updatedCart) {
        updatedCart.items = await Cart.getItems(updatedCart.id);
      }
    } catch (error) {
      // Cart was likely deleted because it's empty
      updatedCart = null;
    }

    res.status(200).json({
      status: 'success',
      message: 'Item removed from cart',
      data: {
        cart: updatedCart,
        removed_item_id: itemId,
        cart_deleted: !updatedCart,
      },
    });
  } catch (error) {
    console.error('Remove from cart error:', error);

    const status = error.message.includes('not found') ? 404 : 500;

    res.status(status).json({
      status: 'error',
      message: error.message || 'Failed to remove item from cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        status: 'fail',
        message: 'Coupon code is required',
      });
    }

    // Get cart
    let cart;
    if (req.user) {
      cart = await Cart.findByUser(req.user.id);
    } else if (req.cookies?.guestId) {
      cart = await Cart.findByGuest(req.cookies.guestId);
    }

    if (!cart) {
      return res.status(404).json({
        status: 'fail',
        message: 'Cart not found',
      });
    }

    // Apply coupon
    const result = await Cart.applyCoupon(cart.id, couponCode);

    // Get updated cart
    const updatedCart = await Cart.findByUserOrGuest(req.user?.id, req.cookies?.guestId);
    updatedCart.items = await Cart.getItems(updatedCart.id);

    res.status(200).json({
      status: 'success',
      message: 'Coupon applied successfully',
      data: {
        cart: updatedCart,
        discount: {
          amount: result.discountAmount,
          coupon: result.coupon.code,
          new_total: result.newTotal,
        },
      },
    });
  } catch (error) {
    console.error('Apply coupon error:', error);

    const status = error.message.includes('Invalid')
      ? 400
      : error.message.includes('not found')
        ? 404
        : 500;

    res.status(status).json({
      status: 'error',
      message: error.message || 'Failed to apply coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.mergeCarts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication required',
      });
    }

    if (!req.cookies?.guestId) {
      return res.status(400).json({
        status: 'fail',
        message: 'No guest cart to merge',
      });
    }

    const guestCart = await Cart.findByGuest(req.cookies.guestId);
    if (!guestCart) {
      return res.status(404).json({
        status: 'fail',
        message: 'Guest cart not found',
      });
    }

    // Merge carts
    const userCartId = await Cart.mergeCarts(req.user.id, guestCart.id);
    res.clearCookie('guestId');

    // Get merged cart
    const mergedCart = await Cart.findByUser(req.user.id);
    mergedCart.items = await Cart.getItems(mergedCart.id);

    res.status(200).json({
      status: 'success',
      message: 'Carts merged successfully',
      data: {
        cart: mergedCart,
        merged_items_count: mergedCart.items.length,
      },
    });
  } catch (error) {
    console.error('Merge carts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to merge carts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
