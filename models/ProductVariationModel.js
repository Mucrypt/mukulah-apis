class ProductVariation {
  constructor(pool) {
    this.pool = pool;
  }

  async create({
    productId,
    sku = null,
    price = null,
    discountPrice = null,
    stockQuantity = 0,
    imageId = null,
    isDefault = false,
    attributes = [],
  }) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // If setting as default, unset any existing default variation
      if (isDefault) {
        await connection.execute(
          'UPDATE product_variations SET is_default = FALSE WHERE product_id = ?',
          [productId]
        );
      }

      const [result] = await connection.execute(
        `INSERT INTO product_variations SET
          product_id = :productId,
          sku = :sku,
          price = :price,
          discount_price = :discountPrice,
          stock_quantity = :stockQuantity,
          image_id = :imageId,
          is_default = :isDefault
        `,
        { productId, sku, price, discountPrice, stockQuantity, imageId, isDefault }
      );

      const variationId = result.insertId;

      // Add attributes if provided
      if (attributes.length > 0) {
        const values = attributes.map((attr) => [variationId, attr.attributeId, attr.valueId]);
        await connection.query(
          'INSERT INTO variation_attributes (variation_id, attribute_id, attribute_value_id) VALUES ?',
          [values]
        );
      }

      await connection.commit();
      return variationId;
    } catch (err) {
      if (connection) await connection.rollback();
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async setAsDefault(variationId, productId) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // Unset any existing default variation
      await connection.execute(
        'UPDATE product_variations SET is_default = FALSE WHERE product_id = ?',
        [productId]
      );

      // Set the new default variation
      const [result] = await connection.execute(
        'UPDATE product_variations SET is_default = TRUE WHERE id = ? AND product_id = ?',
        [variationId, productId]
      );

      await connection.commit();
      return result.affectedRows;
    } catch (err) {
      if (connection) await connection.rollback();
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async update(variationId, updates) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // If setting as default, unset any existing default variation
      if (updates.isDefault) {
        await connection.execute(
          'UPDATE product_variations SET is_default = FALSE WHERE product_id = (SELECT product_id FROM product_variations WHERE id = ?)',
          [variationId]
        );
      }

      const [result] = await connection.execute(
        `UPDATE product_variations SET
          sku = COALESCE(:sku, sku),
          price = COALESCE(:price, price),
          discount_price = COALESCE(:discountPrice, discount_price),
          stock_quantity = COALESCE(:stockQuantity, stock_quantity),
          image_id = COALESCE(:imageId, image_id),
          is_default = COALESCE(:isDefault, is_default)
        WHERE id = :variationId`,
        { ...updates, variationId }
      );

      // Update attributes if provided
      if (updates.attributes) {
        await connection.execute('DELETE FROM variation_attributes WHERE variation_id = ?', [
          variationId,
        ]);

        if (updates.attributes.length > 0) {
          const values = updates.attributes.map((attr) => [
            variationId,
            attr.attributeId,
            attr.valueId,
          ]);
          await connection.query(
            'INSERT INTO variation_attributes (variation_id, attribute_id, attribute_value_id) VALUES ?',
            [values]
          );
        }
      }

      await connection.commit();
      return result.affectedRows;
    } catch (err) {
      if (connection) await connection.rollback();
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async delete(variationId) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      await connection.execute('DELETE FROM variation_attributes WHERE variation_id = ?', [
        variationId,
      ]);

      const [result] = await connection.execute('DELETE FROM product_variations WHERE id = ?', [
        variationId,
      ]);

      await connection.commit();
      return result.affectedRows;
    } catch (err) {
      if (connection) await connection.rollback();
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async updateStock(variationId, quantity) {
    const [result] = await this.pool.execute(
      'UPDATE product_variations SET stock_quantity = ? WHERE id = ?',
      [quantity, variationId]
    );
    return result.affectedRows;
  }
}

module.exports = ProductVariation;
