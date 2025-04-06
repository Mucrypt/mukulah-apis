const { pool } = require('../config/db'); // ✅ correct

class Checkout {
  static async create(userId, checkoutData) {
    const { shippingAddress, paymentMethod, items, totalPrice } = checkoutData;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Create checkout
      const [checkoutResult] = await connection.execute(
        `INSERT INTO checkouts 
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
      const checkoutId = checkoutResult.insertId;

      // Add checkout items
      for (const item of items) {
        await connection.execute(
          `INSERT INTO checkout_items 
          (checkout_id, product_id, name, price, quantity, image, size, color) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            checkoutId,
            item.productId,
            item.name,
            item.price,
            item.quantity,
            item.image,
            item.size || null,
            item.color || null,
          ]
        );

        // Update product stock
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.productId]
        );
      }

      await connection.commit();
      return checkoutId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getCheckoutWithItems(checkoutId) {
    console.log('Fetching checkout with ID:', checkoutId); // Debugging log

    const [checkouts] = await pool.execute(`SELECT * FROM checkouts WHERE id = ? LIMIT 1`, [
      checkoutId,
    ]);

    if (checkouts.length === 0) {
      console.log('No checkout found for ID:', checkoutId); // Debugging log
      return null;
    }

    const checkout = checkouts[0];
    const [items] = await pool.execute(
      `SELECT ci.*, p.stock_status, 
       (SELECT url FROM product_images WHERE product_id = ci.product_id ORDER BY is_primary DESC LIMIT 1) AS image
       FROM checkout_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.checkout_id = ?`,
      [checkoutId]
    );

    console.log('Checkout found:', checkout); // Debugging log
    console.log('Items found:', items); // Debugging log

    return {
      ...checkout,
      items,
    };
  }
}

module.exports = Checkout;
