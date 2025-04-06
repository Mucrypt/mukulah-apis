const { pool } = require('../config/db');
class Order {
  static async create(userId, orderData) {
    const { shippingAddress, paymentMethod, items, totalPrice } = orderData;

    // Validate required fields
    if (
      !shippingAddress ||
      !shippingAddress.address ||
      !shippingAddress.city ||
      !shippingAddress.postalCode ||
      !shippingAddress.country
    ) {
      throw new Error('Invalid shipping address');
    }
    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }
    if (!items || items.length === 0) {
      throw new Error('Order items are required');
    }
    if (!totalPrice || totalPrice <= 0) {
      throw new Error('Total price must be greater than zero');
    }

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
        if (!item.productId || !item.name || !item.quantity || !item.price) {
          console.error('Invalid order item:', item); // Log invalid item for debugging
          throw new Error('Invalid order item');
        }

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
            item.image || null,
            item.size || null,
            item.color || null,
          ]
        );

        // Fetch current stock and sales count
        const [product] = await connection.execute(
          `SELECT stock_quantity, sales_count FROM products WHERE id = ?`,
          [item.productId]
        );

        if (product.length === 0) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        const newStockQuantity = product[0].stock_quantity - item.quantity;
        const newSalesCount = product[0].sales_count + item.quantity;

        // Update product stock and sales count
        await connection.execute(
          `UPDATE products SET 
           stock_quantity = ?, 
           sales_count = ? 
           WHERE id = ?`,
          [newStockQuantity, newSalesCount, item.productId]
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
