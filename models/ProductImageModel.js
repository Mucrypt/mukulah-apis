class ProductImage {
  constructor(pool) {
    this.pool = pool;
  }

  async create({ productId, url, altText = null, isPrimary = false, position = 0 }) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // If setting as primary, unset any existing primary image
      if (isPrimary) {
        await connection.execute(
          'UPDATE product_images SET is_primary = FALSE WHERE product_id = ?',
          [productId]
        );
      }

      const [result] = await connection.execute(
        `INSERT INTO product_images SET
          product_id = :productId,
          url = :url,
          alt_text = :altText,
          is_primary = :isPrimary,
          position = :position
        `,
        { productId, url, altText, isPrimary, position }
      );

      await connection.commit();
      return result.insertId;
    } catch (err) {
      if (connection) await connection.rollback();
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async setAsPrimary(imageId, productId) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // Unset any existing primary image
      await connection.execute(
        'UPDATE product_images SET is_primary = FALSE WHERE product_id = ?',
        [productId]
      );

      // Set the new primary image
      const [result] = await connection.execute(
        'UPDATE product_images SET is_primary = TRUE WHERE id = ? AND product_id = ?',
        [imageId, productId]
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

  async updatePosition(imageId, position) {
    const [result] = await this.pool.execute(
      'UPDATE product_images SET position = ? WHERE id = ?',
      [position, imageId]
    );
    return result.affectedRows;
  }

  async delete(imageId) {
    const [result] = await this.pool.execute('DELETE FROM product_images WHERE id = ?', [imageId]);
    return result.affectedRows;
  }

  async findByProductId(productId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY position ASC',
      [productId]
    );
    return rows;
  }
}

module.exports = ProductImage;
