const { pool } = require('../config/db');
const Product = require('./ProductModel'); // Corrected import path

class Cart {
  static async create(userId = null, guestId = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'INSERT INTO carts (user_id, guest_id) VALUES (?, ?)',
        [userId, guestId]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      console.error('Cart creation failed:', error);
      throw new Error('Failed to create shopping cart');
    } finally {
      connection.release();
    }
  }

  static async findByUser(userId) {
    try {
      const [carts] = await pool.execute(
        `SELECT c.*, 
         (SELECT COUNT(*) FROM cart_items WHERE cart_id = c.id) AS item_count,
         (SELECT SUM(price * quantity) FROM cart_items WHERE cart_id = c.id) AS calculated_total
         FROM carts c WHERE user_id = ? LIMIT 1`,
        [userId]
      );

      if (carts.length > 0) {
        const cart = carts[0];
        // Use calculated total if available, fall back to stored total
        cart.total_price = cart.calculated_total || cart.total_price || 0;
        return cart;
      }
      return null;
    } catch (error) {
      console.error('Error finding user cart:', error);
      throw new Error('Failed to retrieve user cart');
    }
  }

  static async findByGuest(guestId) {
    try {
      const [carts] = await pool.execute(
        `SELECT c.*, 
         (SELECT COUNT(*) FROM cart_items WHERE cart_id = c.id) AS item_count,
         (SELECT SUM(price * quantity) FROM cart_items WHERE cart_id = c.id) AS calculated_total
         FROM carts c WHERE guest_id = ? LIMIT 1`,
        [guestId]
      );

      if (carts.length > 0) {
        const cart = carts[0];
        cart.total_price = cart.calculated_total || cart.total_price || 0;
        return cart;
      }
      return null;
    } catch (error) {
      console.error('Error finding guest cart:', error);
      throw new Error('Failed to retrieve guest cart');
    }
  }

  static async findByUserOrGuest(userId, guestId) {
    if (userId) {
      return await this.findByUser(userId);
    } else if (guestId) {
      return await this.findByGuest(guestId);
    }
    return null;
  }

  static async addItem(cartId, productId, itemData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Fetch product details
      const [products] = await connection.execute(
        `SELECT p.*, 
         (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) AS image_url
         FROM products p WHERE p.id = ? AND p.status = 'published' LIMIT 1`,
        [productId]
      );

      const product = products[0];
      if (!product) {
        throw new Error('Product not available');
      }

      // Check stock availability
      if (product.stock_quantity < itemData.quantity) {
        throw new Error(`Only ${product.stock_quantity} items available in stock`);
      }

      const { size, color, quantity } = itemData;

      // Insert or update item in cart_items
      await connection.execute(
        `INSERT INTO cart_items (cart_id, product_id, name, image, price, size, color, quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
        [cartId, productId, product.name, product.image_url, product.price, size, color, quantity]
      );

      // Recalculate cart totals
      await this.recalculateTotals(connection, cartId);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error('Error adding item to cart:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getItems(cartId) {
    try {
      const [items] = await pool.execute(
        `SELECT ci.*, p.stock_quantity AS max_available,
         (SELECT url FROM product_images WHERE product_id = ci.product_id ORDER BY is_primary DESC LIMIT 1) AS image
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.cart_id = ?`,
        [cartId]
      );
      return items;
    } catch (error) {
      console.error('Error getting cart items:', error);
      throw new Error('Failed to retrieve cart items');
    }
  }

  static async updateItemQuantity(cartId, itemId, quantity) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get current item and product info
      const [items] = await connection.execute(
        `SELECT ci.*, p.stock_quantity 
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.id = ? AND ci.cart_id = ?`,
        [itemId, cartId]
      );

      if (items.length === 0) {
        throw new Error('Item not found in cart');
      }

      const item = items[0];

      // Verify stock availability
      if (quantity > item.stock_quantity) {
        throw new Error(`Only ${item.stock_quantity} items available in stock`);
      }

      if (quantity < 1) {
        await connection.execute('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [
          itemId,
          cartId,
        ]);
      } else {
        await connection.execute(
          'UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?',
          [quantity, itemId, cartId]
        );
      }

      // Update cart totals
      await this.recalculateTotals(connection, cartId);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error updating item quantity:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async removeItem(cartId, itemId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'DELETE FROM cart_items WHERE id = ? AND cart_id = ?',
        [itemId, cartId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Item not found in cart');
      }

      // Update cart totals
      await this.recalculateTotals(connection, cartId);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error removing item from cart:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async recalculateTotals(connection, cartId) {
    try {
      // Calculate subtotal
      await connection.execute(
        `UPDATE carts SET 
         total_price = (SELECT COALESCE(SUM(price * quantity), 0) FROM cart_items WHERE cart_id = ?),
         updated_at = NOW()
         WHERE id = ?`,
        [cartId, cartId]
      );

      // If cart is empty, consider deleting it (for guest carts)
      const [items] = await connection.execute(
        'SELECT COUNT(*) AS count FROM cart_items WHERE cart_id = ?',
        [cartId]
      );

      if (items[0].count === 0) {
        await connection.execute('DELETE FROM carts WHERE id = ? AND user_id IS NULL', [cartId]);
        return false; // Cart was deleted
      }
      return true; // Cart still exists
    } catch (error) {
      console.error('Error recalculating cart totals:', error);
      throw new Error('Failed to update cart totals');
    }
  }

  static async clear(cartId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

      await connection.execute('DELETE FROM carts WHERE id = ?', [cartId]);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error clearing cart:', error);
      throw new Error('Failed to clear cart');
    } finally {
      connection.release();
    }
  }

  static async applyCoupon(cartId, couponCode) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Validate coupon
      const [coupons] = await connection.execute(
        `SELECT * FROM coupons 
         WHERE code = ? AND is_active = 1 
         AND (expires_at IS NULL OR expires_at > NOW())`,
        [couponCode]
      );

      if (coupons.length === 0) {
        throw new Error('Invalid or expired coupon code');
      }

      const coupon = coupons[0];

      // Get current cart total
      const [carts] = await connection.execute('SELECT total_price FROM carts WHERE id = ?', [
        cartId,
      ]);

      if (carts.length === 0) {
        throw new Error('Cart not found');
      }

      const discountAmount =
        coupon.discount_type === 'percentage'
          ? (carts[0].total_price * coupon.discount_value) / 100
          : Math.min(coupon.discount_value, carts[0].total_price);

      const newTotal = carts[0].total_price - discountAmount;

      // Apply coupon
      await connection.execute(
        `UPDATE carts SET 
         total_price = ?,
         discount_amount = ?,
         applied_coupon = ?,
         updated_at = NOW()
         WHERE id = ?`,
        [newTotal, discountAmount, couponCode, cartId]
      );

      await connection.commit();
      return {
        discountAmount,
        newTotal,
        coupon,
      };
    } catch (error) {
      await connection.rollback();
      console.error('Error applying coupon:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async mergeCarts(userId, guestCartId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get or create user cart
      let userCart = await this.findByUser(userId);
      if (!userCart) {
        const cartId = await this.create(userId, null);
        userCart = { id: cartId };
      }

      // Get guest cart items
      const [guestItems] = await connection.execute('SELECT * FROM cart_items WHERE cart_id = ?', [
        guestCartId,
      ]);

      // Transfer items
      for (const item of guestItems) {
        try {
          await this.addItem(userCart.id, item.product_id, {
            name: item.name,
            image: item.image,
            price: item.price,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
          });
        } catch (error) {
          console.warn(`Failed to merge item ${item.id}:`, error.message);
          // Continue with other items
        }
      }

      // Delete guest cart
      await this.clear(guestCartId);

      await connection.commit();
      return userCart.id;
    } catch (error) {
      await connection.rollback();
      console.error('Error merging carts:', error);
      throw new Error('Failed to merge carts');
    } finally {
      connection.release();
    }
  }
}

module.exports = Cart;
