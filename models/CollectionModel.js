const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

class Collection {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Create a new collection
   * @param {Object} collectionData - Collection data
   * @returns {Promise<number>} - ID of the created collection
   * @throws {Error} - If any error occurs during the process
   * @description Creates a new collection with the provided data. The function checks for
   * unique slug and validates the category ID. If the collection is created successfully,
   * it returns the ID of the created collection.
   *
   */
  async create({
    name,
    slug,
    description = null,
    imageUrl = null,
    categoryId,
    startDate = null,
    endDate = null,
  }) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // Validate slug uniqueness
      const [existing] = await connection.execute('SELECT id FROM collections WHERE slug = ?', [
        slug,
      ]);
      if (existing.length > 0) {
        throw new Error('Collection with this slug already exists');
      }

      const [result] = await connection.execute(
        `INSERT INTO collections SET
          name = :name,
          slug = :slug,
          description = :description,
          image_url = :imageUrl,
          category_id = :categoryId,
          start_date = :startDate,
          end_date = :endDate
        `,
        { name, slug, description, imageUrl, categoryId, startDate, endDate }
      );

      await connection.commit();
      await cacheService.clearByPattern('collections:*'); // Invalidate related caches
      return result.insertId;
    } catch (err) {
      if (connection) await connection.rollback();
      logger.error(`Collection creation failed: ${err.message}`, { error: err });
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Find collection by ID
   * @param {number} id - Collection ID
   * @param {boolean} [withProducts=false] - Include products
   * @returns {Promise<Object|null>} - Collection data or null if not found
   */
  async findById(id, withProducts = false) {
    const cacheKey = `collection:${id}:${withProducts}`;
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) return cachedData;

    try {
      const [rows] = await this.pool.execute('SELECT * FROM collections WHERE id = ?', [id]);

      if (rows.length === 0) return null;

      const collection = rows[0];
      if (withProducts) {
        collection.products = await this.getCollectionProducts(id);
      }

      await cacheService.set(cacheKey, collection, 3600); // Cache for 1 hour
      return collection;
    } catch (err) {
      logger.error(`Error finding collection by ID ${id}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Find collections by category
   * @param {number} categoryId - Category ID
   * @param {Object} [options] - Options
   * @param {boolean} [options.activeOnly=true] - Only active collections
   * @returns {Promise<Array>} - Array of collections
   * @throws {Error} - If any error occurs during the process
   * @description Retrieves collections by category ID. The function can filter
   * active collections based on the provided parameter.
   *
   */
  async findByCategory(categoryId, { activeOnly = true } = {}) {
    const cacheKey = `collections:category:${categoryId}:activeOnly:${activeOnly}`;
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) return cachedData;

    try {
      let whereClause = 'WHERE category_id = ?';
      const params = [categoryId];

      if (activeOnly) {
        whereClause +=
          ' AND (start_date IS NULL OR start_date <= NOW()) ' +
          'AND (end_date IS NULL OR end_date >= NOW())';
      }

      const [rows] = await this.pool.execute(
        `SELECT * FROM collections ${whereClause} 
         ORDER BY is_featured DESC, name`,
        params
      );

      await cacheService.set(cacheKey, rows, 3600); // Cache for 1 hour
      return rows;
    } catch (err) {
      logger.error(`Error finding collections by category ${categoryId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Add products to a collection
   * @param {number} collectionId - Collection ID
   * @param {Array<number>} productIds - Array of product IDs
   * @returns {Promise<number>} - Number of products added
   * @throws {Error} - If any error occurs during the process
   * @description Adds products to a collection. The function verifies if the collection exists and
   * if the products are already associated with the collection.
   * If a product already exists in the collection, it will not be added again.
   * The function returns the number of products added.
   *
   */
  async addProducts(collectionId, productIds) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // 1. Verify the collection exists
      const [collection] = await connection.execute('SELECT id FROM collections WHERE id = ?', [
        collectionId,
      ]);
      if (collection.length === 0) {
        throw new Error('Collection not found');
      }

      // 2. Prepare batch insert values with positions
      const values = productIds.map(
        (productId, index) => [collectionId, productId, index + 1] // [collection_id, product_id, position]
      );

      // 3. Insert new associations
      const [result] = await connection.query(
        'INSERT INTO product_collections (collection_id, product_id, position) VALUES ?',
        [values]
      );

      await connection.commit();
      return result.affectedRows;
    } catch (err) {
      if (connection) await connection.rollback();

      // Handle duplicate entry error (code 1062)
      if (err.code === 'ER_DUP_ENTRY') {
        throw new Error('Some products already exist in this collection');
      }

      logger.error(`Error adding products to collection ${collectionId}: ${err.message}`);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get all collections
   * @param {boolean} [activeOnly=false] - Only active collections
   * @returns {Promise<Array>} - Array of collections
   * @throws {Error} - If any error occurs during the process
   * @description Retrieves all collections from the database. The function can filter
   * active collections based on the provided parameter.
   *
   */
  async findAll(activeOnly = false) {
    try {
      let query = 'SELECT * FROM collections';
      const params = [];

      if (activeOnly) {
        query +=
          ' WHERE (start_date IS NULL OR start_date <= NOW()) ' +
          'AND (end_date IS NULL OR end_date >= NOW())';
      }

      query += ' ORDER BY created_at DESC';

      const [rows] = await this.pool.execute(query, params);
      return rows;
    } catch (err) {
      logger.error(`Error finding all collections: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get active collections
   * @returns {Promise<Array>} - Array of active collections
   * @throws {Error} - If any error occurs during the process
   * @description Retrieves all active collections. The function caches the result for 1 hour.
   * If the cache is not found, it fetches from the database and caches the result.
   *
   */
  async getActiveCollections() {
    const cacheKey = 'collections:active';
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) return cachedData;

    const collections = await this.findAll(true);
    await cacheService.set(cacheKey, collections, 3600); // Cache for 1 hour
    return collections;
  }

  /**
   * Get products in a collection
   * @param {number} collectionId - Collection ID
   * @returns {Promise<Array>} - Array of products
   * @throws {Error} - If any error occurs during the process
   * @description Retrieves all products in a specific collection. The function returns an array of products.
   * If the collection is not found, an error is thrown.
   *
   */
  async getCollectionProducts(collectionId) {
    try {
      const [rows] = await this.pool.execute(
        `SELECT p.* FROM products p
         JOIN product_collections pc ON p.id = pc.product_id
         WHERE pc.collection_id = ? AND p.status = 'published'
         ORDER BY pc.position, p.created_at DESC`,
        [collectionId]
      );
      return rows;
    } catch (err) {
      logger.error(`Error getting products for collection ${collectionId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Update a collection
   * @param {number} id - Collection ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<number>} - Number of affected rows
    * @throws {Error} - If any error occurs during the process
    * @description Updates a collection with the provided data. If the collection is not found,
    * an error is thrown. The function returns the number of affected rows.

   */
  async update(id, updates) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // Check if collection exists
      const [existing] = await connection.execute('SELECT id FROM collections WHERE id = ?', [id]);
      if (existing.length === 0) {
        throw new Error('Collection not found');
      }

      // If slug is being updated, check uniqueness
      if (updates.slug) {
        const [duplicate] = await connection.execute(
          'SELECT id FROM collections WHERE slug = ? AND id != ?',
          [updates.slug, id]
        );
        if (duplicate.length > 0) {
          throw new Error('Another collection with this slug already exists');
        }
      }

      const [result] = await connection.execute(
        `UPDATE collections SET
          name = COALESCE(:name, name),
          slug = COALESCE(:slug, slug),
          description = COALESCE(:description, description),
          image_url = COALESCE(:imageUrl, image_url),
          category_id = COALESCE(:categoryId, category_id),
          is_featured = COALESCE(:isFeatured, is_featured),
          start_date = COALESCE(:startDate, start_date),
          end_date = COALESCE(:endDate, end_date),
          status = COALESCE(:status, status)
        WHERE id = :id`,
        { ...updates, id }
      );

      await connection.commit();
      await cacheService.clearByPattern(`collection:${id}:*`);
      await cacheService.clearByPattern('collections:*'); // Invalidate related caches
      return result.affectedRows;
    } catch (err) {
      if (connection) await connection.rollback();
      logger.error(`Error updating collection ${id}: ${err.message}`);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Delete a collection

   * @param {number} id - Collection ID
   * @returns {Promise<number>} - Number of affected rows
    * @throws {Error} - If any error occurs during the process
    * @description Deletes a collection and its associations with products.
    * If the collection is not found, an error is thrown. The function returns the number of affected rows.
    

   */
  async delete(id) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // First remove product associations
      await connection.execute('DELETE FROM product_collections WHERE collection_id = ?', [id]);

      // Then delete the collection
      const [result] = await connection.execute('DELETE FROM collections WHERE id = ?', [id]);

      await connection.commit();
      await cacheService.clearByPattern(`collection:${id}:*`);
      await cacheService.clearByPattern('collections:*'); // Invalidate related caches
      return result.affectedRows;
    } catch (err) {
      if (connection) await connection.rollback();
      logger.error(`Error deleting collection ${id}: ${err.message}`);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Bulk create collections
    * @param {Array<Object>} collectionsData - Array of collection data
    * @returns {Promise<Array<number>>} - Array of IDs of created collections
    * @throws {Error} - If any error occurs during the process
    * @description Creates multiple collections in a single transaction.
    * Each collection is created with the provided data. If a collection with the same slug already exists,
    * an error is thrown. The function returns an array of IDs of the created collections.
    * 

   */
  async bulkCreate(collectionsData) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      const insertedIds = [];
      for (const data of collectionsData) {
        // Set default values for optional fields
        const completeData = {
          description: null,
          imageUrl: null,
          startDate: null,
          endDate: null,
          isFeatured: false,
          status: 'active',
          ...data,
        };

        const [result] = await connection.execute(
          `INSERT INTO collections SET
          name = :name,
          slug = :slug,
          description = :description,
          image_url = :imageUrl,
          category_id = :categoryId,
          start_date = :startDate,
          end_date = :endDate,
          is_featured = :isFeatured,
          status = :status`,
          completeData
        );
        insertedIds.push(result.insertId);
      }

      await connection.commit();
      return insertedIds;
    } catch (err) {
      if (connection) await connection.rollback();
      logger.error(`Bulk create failed: ${err.message}`);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Bulk update collections
   * @param {Array<Object>} updates - Array of collection updates
   * @returns {Promise<number>} - Number of affected rows
   * @throws {Error} - If any error occurs during the process
   * @description Updates multiple collections in a single transaction.
   * Each collection is updated with the provided data.
   * If a collection with the same slug already exists,
   * an error is thrown. The function returns the number of affected rows.
   *
   */
  async bulkUpdate(updates) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      let updatedCount = 0;
      for (const { id, ...data } of updates) {
        const [result] = await connection.execute(
          `UPDATE collections SET
          name = COALESCE(:name, name),
          slug = COALESCE(:slug, slug),
          description = COALESCE(:description, description),
          image_url = COALESCE(:imageUrl, image_url),
          category_id = COALESCE(:categoryId, category_id),
          is_featured = COALESCE(:isFeatured, is_featured),
          start_date = COALESCE(:startDate, start_date),
          end_date = COALESCE(:endDate, end_date),
          status = COALESCE(:status, status)
        WHERE id = :id`,
          { ...data, id }
        );
        updatedCount += result.affectedRows;
      }

      await connection.commit();
      return updatedCount;
    } catch (err) {
      if (connection) await connection.rollback();
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Collection Analytics
   * @param {number} collectionId - Collection ID
   * @returns {Promise<Object|null>} - Collection analytics data
   * @throws {Error} - If any error occurs during the process
   * @description Retrieves analytics data for a specific collection.
   * The function returns an object containing the collection ID, name,
   * product count, order count, items sold, and revenue.
   *
   */
  async getCollectionAnalytics(collectionId) {
    const [results] = await this.pool.execute(
      `
    SELECT 
      c.id,
      c.name,
      COUNT(DISTINCT pc.product_id) as product_count,
      COUNT(DISTINCT o.id) as order_count,
      SUM(oi.quantity) as items_sold,
      SUM(oi.price * oi.quantity) as revenue
    FROM collections c
    LEFT JOIN product_collections pc ON c.id = pc.collection_id
    LEFT JOIN order_items oi ON pc.product_id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE c.id = ?
    GROUP BY c.id
  `,
      [collectionId]
    );

    return results[0] || null;
  }

  /**
   * Top Collections
   * @param {number} limit - Number of collections to retrieve
   * @returns {Promise<Array>} - Array of top collections
   * @throws {Error} - If any error occurs during the process
   * @description Retrieves the top collections based on the number of items sold.
   * The function returns an array of collections with their details.
   *
   */
  async getTopCollections(limit = 10) {
    const [results] = await this.pool.execute(
      `
    SELECT 
      c.*,
      COUNT(DISTINCT o.id) as order_count,
      SUM(oi.quantity) as items_sold
    FROM collections c
    LEFT JOIN product_collections pc ON c.id = pc.collection_id
    LEFT JOIN order_items oi ON pc.product_id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE c.status = 'active'
    GROUP BY c.id
    ORDER BY items_sold DESC
    LIMIT ?
  `,
      [limit]
    );

    return results;
  }

  /**
   * Collection Discovery
   * @param {number} limit - Number of collections to retrieve
   * @returns {Promise<Array>} - Array of trending collections
   * @throws {Error} - If any error occurs during the process
   * @description Retrieves trending collections based on recent orders.
   * The function returns an array of collections with their details.
   *
   */
  async getTrendingCollections(limit = 5) {
    const [results] = await this.pool.execute(
      `
    SELECT c.* FROM collections c
    JOIN product_collections pc ON c.id = pc.collection_id
    JOIN order_items oi ON pc.product_id = oi.product_id
    WHERE c.status = 'active'
    AND oi.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY c.id
    ORDER BY COUNT(oi.id) DESC
    LIMIT ?
  `,
      [limit]
    );

    return results;
  }
  /**
   *
   * @param {number} limit - Number of collections to retrieve
   * @returns {Promise<Array>} - Array of new collections
   * @throws {Error} - If any error occurs during the process
   * @description Retrieves newly created collections.
   * The function returns an array of collections with their details.
   *
   */
  async getNewCollections(limit = 5) {
    const [results] = await this.pool.execute(
      `
    SELECT * FROM collections
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT ?
  `,
      [limit]
    );

    return results;
  }
  /**
   *
   * @param {number} limit - Number of collections to retrieve
   * @returns {Promise<Array>} - Array of collections ending soon
   * @returns {Error} - If any error occurs during the process
   * @description Retrieves collections that are ending soon.
   * The function returns an array of collections with their details.
   *
   */
  async getEndingSoonCollections(limit = 5) {
    const [results] = await this.pool.execute(
      `
    SELECT * FROM collections
    WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
    ORDER BY end_date ASC
    LIMIT ?
  `,
      [limit]
    );

    return results;
  }

  /**
   * Batch Product Operations
   * @param {number} collectionId - Collection ID
   * @param {Array<number>} productIds - Array of product IDs
   * @returns {Promise<number>} - Number of products added
   * @throws {Error} - If any error occurs during the process
   * @description Adds products to a collection in bulk.
   * The function verifies if the collection exists and
   * if the products are already associated with the collection.
   * If a product already exists in the collection,
   * it will not be added again.
   *
   */
  async removeProductsFromCollection(collectionId, productIds) {
    const [result] = await this.pool.execute(
      'DELETE FROM product_collections WHERE collection_id = ? AND product_id IN (?)',
      [collectionId, productIds]
    );
    return result.affectedRows;
  }
  /**
   *
   * @param {number} collectionId - Collection ID
   * @param {Array<number>} productIds - Array of product IDs
   * @returns {Promise<number>} - Number of products added
   * @throws {Error} - If any error occurs during the process
   * @description Replaces all products in a collection with new products.
   * The function verifies if the collection exists and
   * removes all existing products before adding the new ones.
   * If a product already exists in the collection,
   * it will not be added again.
   *
   *
   */
  async replaceCollectionProducts(collectionId, productIds) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // Clear existing products
      await connection.execute('DELETE FROM product_collections WHERE collection_id = ?', [
        collectionId,
      ]);

      // Add new products
      const values = productIds.map((productId, index) => [collectionId, productId, index + 1]);

      const [result] = await connection.query(
        'INSERT INTO product_collections (collection_id, product_id, position) VALUES ?',
        [values]
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
}

module.exports = Collection;
