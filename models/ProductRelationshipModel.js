const cache = require('../services/cacheService');
const CACHE_TTL = 3600; // 1 hour cache lifetime

class ProductRelationship {
  constructor(pool) {
    this.pool = pool;
  }

  // Helper method for cache invalidation
  async invalidateCache(productId, relationshipType) {
    try {
      await cache.clearByPattern(`product:${productId}:${relationshipType}*`);
    } catch (err) {
      console.error(`Cache invalidation error for ${relationshipType}:`, err);
    }
  }

  // Add related products with cache invalidation
  async addRelatedProducts(productId, relatedProductIds) {
    if (!relatedProductIds?.length) return 0;

    const values = relatedProductIds.map((relatedId) => [productId, relatedId]);
    const [result] = await this.pool.query(
      'INSERT IGNORE INTO related_products (product_id, related_product_id) VALUES ?',
      [values]
    );

    await this.invalidateCache(productId, 'related');
    return result.affectedRows;
  }

  // Get related products with caching and pagination
  async getRelatedProducts(productId, { limit = 5, offset = 0 } = {}) {
    const cacheKey = `product:${productId}:related:${limit}:${offset}`;

    try {
      // Try cache first
      const cachedData = await cache.get(cacheKey);
      if (cachedData) return cachedData;

      // Validate and parse inputs
      const parsedProductId = Number(productId);
      const parsedLimit = Number(limit);
      const parsedOffset = Number(offset);

      if (isNaN(parsedProductId)) throw new Error('Invalid product ID');
      if (isNaN(parsedLimit) || parsedLimit <= 0) throw new Error('Invalid limit');
      if (isNaN(parsedOffset) || parsedOffset < 0) throw new Error('Invalid offset');

      const query = `SELECT p.* FROM products p
                   JOIN related_products rp ON p.id = rp.related_product_id
                   WHERE rp.product_id = ? AND p.status = 'published'
                   ORDER BY rp.position
                   LIMIT ? OFFSET ?`;

      // Convert parameters to strings to ensure proper binding
      const [rows] = await this.pool.execute(query, [
        String(productId),
        String(limit),
        String(offset),
      ]);

      // Cache the result
      await cache.set(cacheKey, rows, CACHE_TTL);
      return rows;
    } catch (error) {
      console.error('Error in getRelatedProducts:', error);
      throw error;
    }
  }

  // Get count of related products with caching
  async getRelatedProductsCount(productId) {
    const cacheKey = `product:${productId}:related:count`;

    try {
      const cachedCount = await cache.get(cacheKey);
      if (cachedCount !== null) return cachedCount;

      const [result] = await this.pool.execute(
        `SELECT COUNT(*) as count 
         FROM related_products 
         WHERE product_id = ?`,
        [String(productId)]
      );

      const count = result[0]?.count || 0;
      await cache.set(cacheKey, count, CACHE_TTL);
      return count;
    } catch (error) {
      console.error('Error in getRelatedProductsCount:', error);
      throw error;
    }
  }

  // Cross-sell products methods
  async addCrossSellProducts(productId, crossSellProductIds) {
    if (!crossSellProductIds?.length) return 0;

    const values = crossSellProductIds.map((crossSellId) => [productId, crossSellId]);
    const [result] = await this.pool.query(
      'INSERT IGNORE INTO cross_sell_products (product_id, cross_sell_product_id) VALUES ?',
      [values]
    );

    await this.invalidateCache(productId, 'crossSell');
    return result.affectedRows;
  }

  async getCrossSellProducts(productId, { limit = 5, offset = 0 } = {}) {
    const cacheKey = `product:${productId}:crossSell:${limit}:${offset}`;

    try {
      const cachedData = await cache.get(cacheKey);
      if (cachedData) return cachedData;

      const parsedProductId = Number(productId);
      const parsedLimit = Number(limit);
      const parsedOffset = Number(offset);

      if (isNaN(parsedProductId)) throw new Error('Invalid product ID');
      if (isNaN(parsedLimit) || parsedLimit <= 0) throw new Error('Invalid limit');
      if (isNaN(parsedOffset) || parsedOffset < 0) throw new Error('Invalid offset');

      const query = `SELECT p.* FROM products p
                   JOIN cross_sell_products csp ON p.id = csp.cross_sell_product_id
                   WHERE csp.product_id = ? AND p.status = 'published'
                   ORDER BY csp.position
                   LIMIT ? OFFSET ?`;

      const [rows] = await this.pool.execute(query, [
        String(productId),
        String(limit),
        String(offset),
      ]);

      await cache.set(cacheKey, rows, CACHE_TTL);
      return rows;
    } catch (error) {
      console.error('Error in getCrossSellProducts:', error);
      throw error;
    }
  }

  async getCrossSellProductsCount(productId) {
    const cacheKey = `product:${productId}:crossSell:count`;

    try {
      const cachedCount = await cache.get(cacheKey);
      if (cachedCount !== null) return cachedCount;

      const [result] = await this.pool.execute(
        `SELECT COUNT(*) as count 
         FROM cross_sell_products 
         WHERE product_id = ?`,
        [String(productId)]
      );

      const count = result[0]?.count || 0;
      await cache.set(cacheKey, count, CACHE_TTL);
      return count;
    } catch (error) {
      console.error('Error in getCrossSellProductsCount:', error);
      throw error;
    }
  }

  // Up-sell products methods
  async addUpSellProducts(productId, upSellProductIds) {
    if (!upSellProductIds?.length) return 0;

    const values = upSellProductIds.map((upSellId) => [productId, upSellId]);
    const [result] = await this.pool.query(
      'INSERT IGNORE INTO up_sell_products (product_id, up_sell_product_id) VALUES ?',
      [values]
    );

    await this.invalidateCache(productId, 'upSell');
    return result.affectedRows;
  }

  async getUpSellProducts(productId, { limit = 5, offset = 0 } = {}) {
    const cacheKey = `product:${productId}:upSell:${limit}:${offset}`;

    try {
      const cachedData = await cache.get(cacheKey);
      if (cachedData) return cachedData;

      const parsedProductId = Number(productId);
      const parsedLimit = Number(limit);
      const parsedOffset = Number(offset);

      if (isNaN(parsedProductId)) throw new Error('Invalid product ID');
      if (isNaN(parsedLimit) || parsedLimit <= 0) throw new Error('Invalid limit');
      if (isNaN(parsedOffset) || parsedOffset < 0) throw new Error('Invalid offset');

      const query = `SELECT p.* FROM products p
                   JOIN up_sell_products usp ON p.id = usp.up_sell_product_id
                   WHERE usp.product_id = ? AND p.status = 'published'
                   ORDER BY usp.position
                   LIMIT ? OFFSET ?`;

      const [rows] = await this.pool.execute(query, [
        String(productId),
        String(limit),
        String(offset),
      ]);

      await cache.set(cacheKey, rows, CACHE_TTL);
      return rows;
    } catch (error) {
      console.error('Error in getUpSellProducts:', error);
      throw error;
    }
  }

  async getUpSellProductsCount(productId) {
    const cacheKey = `product:${productId}:upSell:count`;

    try {
      const cachedCount = await cache.get(cacheKey);
      if (cachedCount !== null) return cachedCount;

      const [result] = await this.pool.execute(
        `SELECT COUNT(*) as count 
         FROM up_sell_products 
         WHERE product_id = ?`,
        [String(productId)]
      );

      const count = result[0]?.count || 0;
      await cache.set(cacheKey, count, CACHE_TTL);
      return count;
    } catch (error) {
      console.error('Error in getUpSellProductsCount:', error);
      throw error;
    }
  }

  // Removal methods with cache invalidation
  async removeRelatedProducts(productId, relatedProductIds) {
    if (!relatedProductIds?.length) return 0;

    const [result] = await this.pool.execute(
      'DELETE FROM related_products WHERE product_id = ? AND related_product_id IN (?)',
      [String(productId), relatedProductIds]
    );

    await this.invalidateCache(productId, 'related');
    return result.affectedRows;
  }

  async removeCrossSellProducts(productId, crossSellProductIds) {
    if (!crossSellProductIds?.length) return 0;

    const [result] = await this.pool.execute(
      'DELETE FROM cross_sell_products WHERE product_id = ? AND cross_sell_product_id IN (?)',
      [String(productId), crossSellProductIds]
    );

    await this.invalidateCache(productId, 'crossSell');
    return result.affectedRows;
  }

  async removeUpSellProducts(productId, upSellProductIds) {
    if (!upSellProductIds?.length) return 0;

    const [result] = await this.pool.execute(
      'DELETE FROM up_sell_products WHERE product_id = ? AND up_sell_product_id IN (?)',
      [String(productId), upSellProductIds]
    );

    await this.invalidateCache(productId, 'upSell');
    return result.affectedRows;
  }

  // Update positions with cache invalidation
  async updatePositions(productId, relationshipType, positions) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      let tableName, idColumnName;
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
          [String(position), String(productId), String(relatedId)]
        );
      }

      await connection.commit();
      await this.invalidateCache(productId, relationshipType);
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
