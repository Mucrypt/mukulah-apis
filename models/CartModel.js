const pool = require('../config/db');

class Cart {
  static async create(userId = null, guestId = null) {
    const [result] = await pool.execute('INSERT INTO carts (user_id, guest_id) VALUES (?, ?)', [
      userId,
      guestId,
    ]);
    return result.insertId;
  }

  static async findByUser(userId) {
    const [carts] = await pool.execute('SELECT * FROM carts WHERE user_id = ? LIMIT 1', [userId]);
    return carts[0];
  }

  static async findByGuest(guestId) {
    const [carts] = await pool.execute('SELECT * FROM carts WHERE guest_id = ? LIMIT 1', [guestId]);
    return carts[0];
  }

  static async addItem(cartId, productId, itemData) {
    const { name, image, price, size, color, quantity } = itemData;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if item already exists in cart
      const [existingItems] = await connection.execute(
        'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1',
        [cartId, productId]
      );

      if (existingItems.length > 0) {
        // Update quantity if item exists
        await connection.execute('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [
          quantity,
          existingItems[0].id,
        ]);
      } else {
        // Add new item
        await connection.execute(
          `INSERT INTO cart_items 
          (cart_id, product_id, name, image, price, size, color, quantity) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [cartId, productId, name, image, price, size, color, quantity]
        );
      }

      // Update cart total
      await connection.execute(
        `UPDATE carts SET total_price = (
          SELECT SUM(price * quantity) 
          FROM cart_items 
          WHERE cart_id = ?
        ) WHERE id = ?`,
        [cartId, cartId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getItems(cartId) {
    const [items] = await pool.execute('SELECT * FROM cart_items WHERE cart_id = ?', [cartId]);
    return items;
  }

  static async updateItemQuantity(cartId, itemId, quantity) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Update item quantity
      await connection.execute('UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?', [
        quantity,
        itemId,
        cartId,
      ]);

      // Update cart total
      await connection.execute(
        `UPDATE carts SET total_price = (
          SELECT SUM(price * quantity) 
          FROM cart_items 
          WHERE cart_id = ?
        ) WHERE id = ?`,
        [cartId, cartId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async removeItem(cartId, itemId) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Remove item
      await connection.execute('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [
        itemId,
        cartId,
      ]);

      // Update cart total
      await connection.execute(
        `UPDATE carts SET total_price = (
          SELECT IFNULL(SUM(price * quantity), 0)
          FROM cart_items 
          WHERE cart_id = ?
        ) WHERE id = ?`,
        [cartId, cartId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async clear(cartId) {
    await pool.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    await pool.execute('UPDATE carts SET total_price = 0 WHERE id = ?', [cartId]);
  }
}

module.exports = Cart;
