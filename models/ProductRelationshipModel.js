class ProductRelationship {
  constructor(pool) {
    this.pool = pool;
  }

  async addRelatedProducts(productId, relatedProductIds) {
    if (!relatedProductIds.length) return 0;

    const values = relatedProductIds.map((relatedId) => [productId, relatedId]);
    const [result] = await this.pool.query(
      'INSERT IGNORE INTO related_products (product_id, related_product_id) VALUES ?',
      [values]
    );
    return result.affectedRows;
  }

  async getRelatedProducts(productId, { limit = 5 } = {}) {
    const [rows] = await this.pool.execute(
      `SELECT p.* FROM products p
       JOIN related_products rp ON p.id = rp.related_product_id
       WHERE rp.product_id = ? AND p.status = 'published'
       ORDER BY rp.position
       LIMIT ?`,
      [productId, limit]
    );
    return rows;
  }

  async addCrossSellProducts(productId, crossSellProductIds) {
    if (!crossSellProductIds.length) return 0;

    const values = crossSellProductIds.map((crossSellId) => [productId, crossSellId]);
    const [result] = await this.pool.query(
      'INSERT IGNORE INTO cross_sell_products (product_id, cross_sell_product_id) VALUES ?',
      [values]
    );
    return result.affectedRows;
  }

  async getCrossSellProducts(productId, { limit = 5 } = {}) {
    const [rows] = await this.pool.execute(
      `SELECT p.* FROM products p
       JOIN cross_sell_products csp ON p.id = csp.cross_sell_product_id
       WHERE csp.product_id = ? AND p.status = 'published'
       ORDER BY csp.position
       LIMIT ?`,
      [productId, limit]
    );
    return rows;
  }

  async addUpSellProducts(productId, upSellProductIds) {
    if (!upSellProductIds.length) return 0;

    const values = upSellProductIds.map((upSellId) => [productId, upSellId]);
    const [result] = await this.pool.query(
      'INSERT IGNORE INTO up_sell_products (product_id, up_sell_product_id) VALUES ?',
      [values]
    );
    return result.affectedRows;
  }

  async getUpSellProducts(productId, { limit = 5 } = {}) {
    const [rows] = await this.pool.execute(
      `SELECT p.* FROM products p
       JOIN up_sell_products usp ON p.id = usp.up_sell_product_id
       WHERE usp.product_id = ? AND p.status = 'published'
       ORDER BY usp.position
       LIMIT ?`,
      [productId, limit]
    );
    return rows;
  }

  async removeRelatedProducts(productId, relatedProductIds) {
    if (!relatedProductIds.length) return 0;

    const [result] = await this.pool.execute(
      'DELETE FROM related_products WHERE product_id = ? AND related_product_id IN (?)',
      [productId, relatedProductIds]
    );
    return result.affectedRows;
  }

  async removeCrossSellProducts(productId, crossSellProductIds) {
    if (!crossSellProductIds.length) return 0;

    const [result] = await this.pool.execute(
      'DELETE FROM cross_sell_products WHERE product_id = ? AND cross_sell_product_id IN (?)',
      [productId, crossSellProductIds]
    );
    return result.affectedRows;
  }

  async removeUpSellProducts(productId, upSellProductIds) {
    if (!upSellProductIds.length) return 0;

    const [result] = await this.pool.execute(
      'DELETE FROM up_sell_products WHERE product_id = ? AND up_sell_product_id IN (?)',
      [productId, upSellProductIds]
    );
    return result.affectedRows;
  }

  async updatePositions(productId, relationshipType, positions) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      let tableName;
      let idColumnName;

      switch (relationshipType) {
        case 'related':
          tableName = 'related_products';
          idColumnName = 'related_product_id';
          break;
        case 'cross_sell':
          tableName = 'cross_sell_products';
          idColumnName = 'cross_sell_product_id';
          break;
        case 'up_sell':
          tableName = 'up_sell_products';
          idColumnName = 'up_sell_product_id';
          break;
        default:
          throw new Error('Invalid relationship type');
      }

      for (const [relatedId, position] of Object.entries(positions)) {
        await connection.execute(
          `UPDATE ${tableName} SET position = ? 
           WHERE product_id = ? AND ${idColumnName} = ?`,
          [position, productId, relatedId]
        );
      }

      await connection.commit();
      return true;
    } catch (err) {
      if (connection) await connection.rollback();
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = ProductRelationship;
