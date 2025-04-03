const pool = require('../config/db');

class Order {
  static async create(userId, orderData) {
    const { shippingAddress, paymentMethod, items, totalPrice } = orderData;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Create order
      const [orderResult] = await connection.execute(
        `INSERT INTO orders 
        (user_id, shipping_address, shipping_city, shipping_postal_code, shipping_country, 
         payment_method, total_price) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          shippingAddress.address,
          shippingAddress.city,
          shippingAddress.postalCode,
          shippingAddress.country,
          paymentMethod,
          totalPrice,
        ]
      );
      const orderId = orderResult.insertId;

      // Add order items
      for (const item of items) {
        await connection.execute(
          `INSERT INTO order_items 
          (order_id, product_id, name, quantity, price, image, size, color) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.productId,
            item.name,
            item.quantity,
            item.price,
            item.image,
            item.size || null,
            item.color || null,
          ]
        );

        // Update product stock and sales count
        await connection.execute(
          `UPDATE products SET 
           stock_quantity = stock_quantity - ?,
           sales_count = sales_count + ? 
           WHERE id = ?`,
          [item.quantity, item.quantity, item.productId]
        );
      }

      await connection.commit();
      return orderId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
    return orders[0];
  }

  static async getItems(orderId) {
    const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    return items;
  }

  static async findByUser(userId) {
    const [orders] = await pool.execute(
      `SELECT o.*, 
       (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return orders;
  }

  static async updateStatus(orderId, status) {
    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
  }
}

module.exports = Order;
