const { withTransaction } = require('../utils/transaction');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const AppError = require('../utils/appError');

class Category {
  constructor(pool) {
    this.pool = pool;
  }

  // ==================== CORE CRUD OPERATIONS ====================

  async create({ name, slug, description = null, imageUrl = null, parentId = null }) {
    return withTransaction(async (connection) => {
      // Get parent's left value if exists
      let left = 1;
      if (parentId) {
        const [parent] = await connection.execute('SELECT lft, rgt FROM categories WHERE id = ?', [
          parentId,
        ]);
        if (parent.length === 0) throw new AppError('Parent category not found', 404);
        left = parent[0].rgt;
      }

      // Make space for the new node
      await connection.execute('UPDATE categories SET rgt = rgt + 2 WHERE rgt >= ?', [left]);
      await connection.execute('UPDATE categories SET lft = lft + 2 WHERE lft > ?', [left]);

      // Insert the new category with created_at
      const [result] = await connection.execute(
        `INSERT INTO categories SET
        name = :name,
        slug = :slug,
        description = :description,
        image_url = :imageUrl,
        parent_id = :parentId,
        lft = :left,
        rgt = :right,
        depth = :depth,
        created_at = NOW(),
        updated_at = NOW()
      `,
        {
          name,
          slug,
          description,
          imageUrl,
          parentId,
          left,
          right: left + 1,
          depth: parentId ? (await this.getDepth(parentId)) + 1 : 0,
        }
      );

      // Invalidate cache
      await cacheService.clearByPattern('category_tree:*');
      return result.insertId;
    });
  }

  async findById(id, withChildren = false, withProducts = false, withAnalytics = false) {
    const cacheKey = `category:${id}:${withChildren}:${withProducts}:${withAnalytics}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const [rows] = await this.pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
    if (rows.length === 0) {
      throw new AppError(`Category with ID ${id} not found`, 404);
    }

    const category = rows[0];

    if (withChildren) {
      category.children = await this.getChildren(id);
    }
    if (withProducts) {
      category.products = await this.getCategoryProducts(id);
    }
    if (withAnalytics) {
      category.analytics = await this.getCategoryAnalytics(id);
    }

    await cacheService.set(cacheKey, category, 3600); // Cache for 1 hour
    return category;
  }

  async update(id, updates) {
    return withTransaction(async (connection) => {
      // If slug is being updated, check uniqueness
      if (updates.slug) {
        const [existing] = await connection.execute(
          'SELECT id FROM categories WHERE slug = ? AND id != ?',
          [updates.slug, id]
        );
        if (existing.length > 0) {
          throw new AppError('Another category with this slug already exists', 409);
        }
      }

      // Build the SET clause dynamically based on provided updates
      const setClauses = [];
      const params = {};

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setClauses.push(`${key} = :${key}`);
          params[key] = value;
        }
      }

      // Always update the updated_at timestamp
      setClauses.push('updated_at = NOW()');

      if (setClauses.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      const query = `UPDATE categories SET ${setClauses.join(', ')} WHERE id = :id`;
      params.id = id;

      const [result] = await connection.execute(query, params);

      // Invalidate relevant caches
      await cacheService.clearByPattern(`category:${id}:*`);
      await cacheService.clearByPattern('category_tree:*');
      return result.affectedRows;
    });
  }

  async delete(id) {
    return withTransaction(async (connection) => {
      // Get category bounds
      const [category] = await connection.execute('SELECT lft, rgt FROM categories WHERE id = ?', [
        id,
      ]);
      if (category.length === 0) {
        throw new AppError(`Category with ID ${id} not found`, 404);
      }

      const { lft, rgt } = category[0];
      const width = rgt - lft + 1;

      // Delete the category and its descendants
      await connection.execute('DELETE FROM categories WHERE lft BETWEEN ? AND ?', [lft, rgt]);

      // Close the gap
      await connection.execute('UPDATE categories SET rgt = rgt - ? WHERE rgt > ?', [width, rgt]);
      await connection.execute('UPDATE categories SET lft = lft - ? WHERE lft > ?', [width, rgt]);

      // Invalidate caches
      await cacheService.clearByPattern('category:*');
      await cacheService.clearByPattern('category_tree:*');
      return true;
    });
  }

  // ==================== TREE OPERATIONS ====================

  async getFullTree() {
    const cacheKey = 'category_tree:full';
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const [rows] = await this.pool.execute('SELECT * FROM categories ORDER BY lft');
    const tree = this.buildTree(rows);

    await cacheService.set(cacheKey, tree, 86400); // Cache for 24 hours
    return tree;
  }

  buildTree(categories, parentId = null) {
    const tree = [];
    for (const category of categories) {
      if (category.parent_id === parentId) {
        const children = this.buildTree(categories, category.id);
        if (children.length) {
          category.children = children;
        }
        tree.push(category);
      }
    }
    return tree;
  }

  async getChildren(parentId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM categories WHERE parent_id = ? ORDER BY name',
      [parentId]
    );
    return rows;
  }

  async getDepth(categoryId) {
    const [rows] = await this.pool.execute('SELECT depth FROM categories WHERE id = ?', [
      categoryId,
    ]);
    return rows[0]?.depth || 0;
  }

  // ==================== PRODUCT DISCOVERY ====================

  async getCategoryProducts(categoryId, filters = {}) {
    const cacheKey = `category:${categoryId}:products:${JSON.stringify(filters)}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    let query = `
      SELECT p.* FROM products p
      JOIN product_categories pc ON p.id = pc.product_id
      WHERE pc.category_id = ? AND p.status = 'published'
    `;
    const params = [categoryId];

    // Apply filters
    if (filters.minPrice) {
      query += ' AND p.price >= ?';
      params.push(filters.minPrice);
    }
    if (filters.maxPrice) {
      query += ' AND p.price <= ?';
      params.push(filters.maxPrice);
    }
    if (filters.rating) {
      query += ' AND (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id) >= ?';
      params.push(filters.rating);
    }

    // Sorting
    query += ' ORDER BY ';
    switch (filters.sortBy) {
      case 'price_asc':
        query += 'p.price ASC';
        break;
      case 'price_desc':
        query += 'p.price DESC';
        break;
      case 'rating':
        query += '(SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id) DESC';
        break;
      case 'newest':
        query += 'p.created_at DESC';
        break;
      default:
        query += 'p.created_at DESC';
    }

    const [rows] = await this.pool.execute(query, params);
    await cacheService.set(cacheKey, rows, 600); // Cache for 10 minutes
    return rows;
  }

  async getTrendingProducts(categoryId, limit = 10) {
    const [rows] = await this.pool.execute(
      `
      SELECT p.*, COUNT(oi.id) as order_count
      FROM products p
      JOIN product_categories pc ON p.id = pc.product_id
      JOIN order_items oi ON p.id = oi.product_id
      WHERE pc.category_id = ? 
        AND oi.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY p.id
      ORDER BY order_count DESC
      LIMIT ?
    `,
      [categoryId, limit]
    );
    return rows;
  }

  async getDiscountedProducts(categoryId, limit = 10) {
    const [rows] = await this.pool.execute(
      `
      SELECT p.* 
      FROM products p
      JOIN product_categories pc ON p.id = pc.product_id
      JOIN product_discounts pd ON p.id = pd.product_id
      WHERE pc.category_id = ? 
        AND pd.start_date <= NOW() 
        AND pd.end_date >= NOW()
      ORDER BY pd.discount_percentage DESC
      LIMIT ?
    `,
      [categoryId, limit]
    );
    return rows;
  }

  // ==================== ANALYTICS & METRICS ====================

  async getCategoryAnalytics(categoryId) {
    const [results] = await this.pool.execute(
      `
      SELECT 
        c.id,
        c.name,
        COUNT(DISTINCT pc.product_id) as product_count,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as items_sold,
        SUM(oi.price * oi.quantity) as revenue,
        AVG(pr.rating) as avg_rating,
        COUNT(DISTINCT pr.id) as review_count,
        COUNT(DISTINCT CASE WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN o.id END) as weekly_orders,
        SUM(CASE WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN oi.quantity ELSE 0 END) as weekly_items,
        SUM(CASE WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN oi.price * oi.quantity ELSE 0 END) as weekly_revenue
      FROM categories c
      LEFT JOIN product_categories pc ON c.id = pc.category_id
      LEFT JOIN products p ON pc.product_id = p.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN product_reviews pr ON p.id = pr.product_id
      WHERE c.id = ?
      GROUP BY c.id
    `,
      [categoryId]
    );

    return results[0] || null;
  }

  async getTopCategories(limit = 10) {
    const [results] = await this.pool.execute(
      `
      SELECT 
        c.*,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as items_sold,
        SUM(oi.price * oi.quantity) as revenue
      FROM categories c
      LEFT JOIN product_categories pc ON c.id = pc.category_id
      LEFT JOIN order_items oi ON pc.product_id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY revenue DESC
      LIMIT ?
    `,
      [limit]
    );

    return results;
  }

  async addProductsToCategory(categoryId, productIds) {
    return withTransaction(async (connection) => {
      let addedCount = 0;

      for (const productId of productIds) {
        try {
          // Check if the relationship already exists
          const [existing] = await connection.execute(
            'SELECT * FROM product_categories WHERE product_id = ? AND category_id = ?',
            [productId, categoryId]
          );

          if (existing.length === 0) {
            await connection.execute(
              'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)',
              [productId, categoryId]
            );
            addedCount++;
          }
        } catch (err) {
          logger.error(
            `Error adding product ${productId} to category ${categoryId}: ${err.message}`
          );
          // Continue with next product even if one fails
        }
      }

      // Invalidate relevant caches
      await cacheService.clearByPattern(`category:${categoryId}:*`);
      await cacheService.clearByPattern('category_tree:*');

      return addedCount;
    });
  }

  async getConversionFunnel(categoryId) {
    const [results] = await this.pool.execute(
      `
      SELECT
        COUNT(DISTINCT pv.session_id) as views,
        COUNT(DISTINCT CASE WHEN ci.id IS NOT NULL THEN pv.session_id END) as carts,
        COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN pv.session_id END) as orders,
        COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN pv.user_id END) as unique_buyers
      FROM product_views pv
      JOIN product_categories pc ON pv.product_id = pc.product_id
      LEFT JOIN cart_items ci ON pv.product_id = ci.product_id AND ci.created_at >= pv.viewed_at
      LEFT JOIN order_items oi ON ci.id = oi.cart_item_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE pc.category_id = ?
        AND pv.viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `,
      [categoryId]
    );

    return results[0] || null;
  }

  // ==================== PERSONALIZATION & AI ====================

  async getPersonalizedCategories(userId) {
    // 1. Get user's purchase history categories
    const [purchaseCategories] = await this.pool.execute(
      `
      SELECT DISTINCT pc.category_id
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN product_categories pc ON oi.product_id = pc.product_id
      WHERE o.user_id = ?
    `,
      [userId]
    );

    // 2. Get similar users' preferred categories
    const [similarUserCategories] = await this.pool.execute(
      `
      SELECT pc.category_id, COUNT(*) as affinity
      FROM user_affinities ua
      JOIN orders o ON ua.similar_user_id = o.user_id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN product_categories pc ON oi.product_id = pc.product_id
      WHERE ua.user_id = ? AND ua.score > 0.7
      GROUP BY pc.category_id
      ORDER BY affinity DESC
      LIMIT 5
    `,
      [userId]
    );

    // 3. Combine with trending categories
    const trending = await this.getTopCategories(5);

    return {
      basedOnPurchases: purchaseCategories.map((c) => c.category_id),
      similarUsersLike: similarUserCategories.map((c) => c.category_id),
      trending: trending.map((c) => c.id),
    };
  }

  async getAICategorySuggestions(categoryId) {
    // In a real implementation, this would call an AI service
    const [results] = await this.pool.execute(
      `
      SELECT 
        c2.id,
        c2.name,
        COUNT(DISTINCT o.id) as co_purchases
      FROM categories c1
      JOIN product_categories pc1 ON c1.id = pc1.category_id
      JOIN product_relationships pr ON pc1.product_id = pr.product_id
      JOIN product_categories pc2 ON pr.related_product_id = pc2.product_id
      JOIN categories c2 ON pc2.category_id = c2.id
      JOIN order_items oi ON pr.related_product_id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE c1.id = ? AND c2.id != ?
      GROUP BY c2.id
      ORDER BY co_purchases DESC
      LIMIT 5
    `,
      [categoryId, categoryId]
    );

    return results;
  }

  // ==================== VISUAL MERCHANDISING ====================

  async setDisplayLayout(categoryId, layout) {
    await this.pool.execute('UPDATE categories SET display_layout = ? WHERE id = ?', [
      layout,
      categoryId,
    ]);
    await cacheService.clearByPattern(`category:${categoryId}:*`);
    return true;
  }

  async addCategoryBanner(categoryId, bannerData) {
    const [result] = await this.pool.execute(
      `INSERT INTO category_banners SET
        category_id = ?,
        image_url = ?,
        title = ?,
        subtitle = ?,
        link_url = ?,
        is_active = ?,
        display_order = ?
      `,
      [
        categoryId,
        bannerData.imageUrl,
        bannerData.title,
        bannerData.subtitle,
        bannerData.linkUrl,
        bannerData.isActive || true,
        bannerData.displayOrder || 0,
      ]
    );
    await cacheService.clearByPattern(`category:${categoryId}:*`);
    return result.insertId;
  }

  // ==================== INVENTORY MANAGEMENT ====================

  async getLowStockProducts(categoryId, threshold = 5) {
    const [rows] = await this.pool.execute(
      `
      SELECT p.*, i.quantity as stock_level
      FROM products p
      JOIN product_categories pc ON p.id = pc.product_id
      JOIN inventory i ON p.id = i.product_id
      WHERE pc.category_id = ? AND i.quantity <= ?
      ORDER BY i.quantity ASC
    `,
      [categoryId, threshold]
    );
    return rows;
  }

  async getInventorySummary(categoryId) {
    const [results] = await this.pool.execute(
      `
      SELECT
        COUNT(p.id) as total_products,
        SUM(CASE WHEN i.quantity = 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN i.quantity > 0 AND i.quantity <= 5 THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN i.quantity > 5 THEN 1 ELSE 0 END) as in_stock,
        AVG(i.quantity) as avg_stock_level
      FROM products p
      JOIN product_categories pc ON p.id = pc.product_id
      JOIN inventory i ON p.id = i.product_id
      WHERE pc.category_id = ?
    `,
      [categoryId]
    );
    return results[0] || null;
  }

  // ==================== MULTI-CHANNEL INTEGRATION ====================

  async syncCategoryToChannels(categoryId, channels) {
    return withTransaction(async (connection) => {
      // First remove existing sync records for this category
      await connection.execute('DELETE FROM category_channel_sync WHERE category_id = ?', [
        categoryId,
      ]);

      // Insert new sync records
      for (const channel of channels) {
        await connection.execute(
          `INSERT INTO category_channel_sync SET
            category_id = ?,
            channel_id = ?,
            external_id = ?,
            sync_status = 'pending'
          `,
          [categoryId, channel.channelId, channel.externalId]
        );
      }

      // Invalidate cache
      await cacheService.clearByPattern(`category:${categoryId}:*`);
      return true;
    });
  }

  async getCrossChannelPerformance(categoryId) {
    const [results] = await this.pool.execute(
      `
      SELECT
        c.name as channel_name,
        COUNT(DISTINCT o.id) as orders,
        SUM(oi.quantity) as items_sold,
        SUM(oi.price * oi.quantity) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN product_categories pc ON oi.product_id = pc.product_id
      JOIN channels c ON o.channel_id = c.id
      WHERE pc.category_id = ?
      GROUP BY c.name
      ORDER BY revenue DESC
    `,
      [categoryId]
    );
    return results;
  }

  // ==================== SEASONAL & TEMPORAL FEATURES ====================

  async setSeasonalAttributes(categoryId, attributes) {
    await this.pool.execute(
      `UPDATE categories SET
        seasonal_title = ?,
        seasonal_image_url = ?,
        seasonal_start_date = ?,
        seasonal_end_date = ?
      WHERE id = ?`,
      [attributes.title, attributes.imageUrl, attributes.startDate, attributes.endDate, categoryId]
    );
    await cacheService.clearByPattern(`category:${categoryId}:*`);
    return true;
  }

  async getUpcomingSeasonalCategories(limit = 5) {
    const [results] = await this.pool.execute(
      `
      SELECT * FROM categories
      WHERE seasonal_start_date IS NOT NULL
        AND seasonal_start_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)
      ORDER BY seasonal_start_date ASC
      LIMIT ?
    `,
      [limit]
    );
    return results;
  }

  // ==================== BULK OPERATIONS ====================

  async bulkUpdateCategories(updates) {
    return withTransaction(async (connection) => {
      let updatedCount = 0;
      for (const { id, ...data } of updates) {
        const [result] = await connection.execute(
          `UPDATE categories SET
            name = COALESCE(?, name),
            slug = COALESCE(?, slug),
            status = COALESCE(?, status)
          WHERE id = ?`,
          [data.name, data.slug, data.status, id]
        );
        updatedCount += result.affectedRows;
        await cacheService.clearByPattern(`category:${id}:*`);
      }
      await cacheService.clearByPattern('category_tree:*');
      return updatedCount;
    });
  }

  async bulkUpdateStatus(categoryIds, status) {
    const [result] = await this.pool.execute('UPDATE categories SET status = ? WHERE id IN (?)', [
      status,
      categoryIds,
    ]);
    await cacheService.clearByPattern('category:*');
    await cacheService.clearByPattern('category_tree:*');
    return result.affectedRows;
  }

  // ==================== CATEGORY RELATIONSHIPS ====================

  async getComplementaryCategories(categoryId) {
    const [results] = await this.pool.execute(
      `
      SELECT 
        c2.id,
        c2.name,
        COUNT(DISTINCT o.id) as co_purchases
      FROM categories c1
      JOIN product_categories pc1 ON c1.id = pc1.category_id
      JOIN product_relationships pr ON pc1.product_id = pr.product_id
      JOIN product_categories pc2 ON pr.related_product_id = pc2.product_id
      JOIN categories c2 ON pc2.category_id = c2.id
      JOIN order_items oi ON pr.related_product_id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE c1.id = ? 
        AND pr.relationship_type = 'complementary'
        AND c2.id != ?
      GROUP BY c2.id
      ORDER BY co_purchases DESC
      LIMIT 5
    `,
      [categoryId, categoryId]
    );
    return results;
  }

  async getFrequentlyBoughtTogether(categoryId) {
    const [results] = await this.pool.execute(
      `
      SELECT 
        c2.id,
        c2.name,
        COUNT(DISTINCT o.id) as co_purchases
      FROM categories c1
      JOIN product_categories pc1 ON c1.id = pc1.category_id
      JOIN product_bundle_items pbi ON pc1.product_id = pbi.product_id
      JOIN product_categories pc2 ON pbi.bundle_id = pc2.product_id
      JOIN categories c2 ON pc2.category_id = c2.id
      JOIN order_items oi ON pbi.bundle_id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE c1.id = ? AND c2.id != ?
      GROUP BY c2.id
      ORDER BY co_purchases DESC
      LIMIT 3
    `,
      [categoryId, categoryId]
    );
    return results;
  }

  // ==================== LOCALIZATION & INTERNATIONALIZATION ====================

  async addTranslation(categoryId, translation) {
    await this.pool.execute(
      `INSERT INTO category_translations SET
        category_id = ?,
        language_code = ?,
        name = ?,
        description = ?,
        meta_title = ?,
        meta_description = ?,
        meta_keywords = ?
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        meta_title = VALUES(meta_title),
        meta_description = VALUES(meta_description),
        meta_keywords = VALUES(meta_keywords)
      `,
      [
        categoryId,
        translation.languageCode,
        translation.name,
        translation.description,
        translation.metaTitle,
        translation.metaDescription,
        translation.metaKeywords,
      ]
    );
    await cacheService.clearByPattern(`category:${categoryId}:*`);
    return true;
  }

  async getLocalizedCategoryTree(languageCode) {
    const cacheKey = `category_tree:${languageCode}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const [categories] = await this.pool.execute(
      `
      SELECT 
        c.*,
        ct.name as translated_name,
        ct.description as translated_description
      FROM categories c
      LEFT JOIN category_translations ct ON c.id = ct.category_id AND ct.language_code = ?
      ORDER BY c.lft
    `,
      [languageCode]
    );

    const tree = this.buildLocalizedTree(categories, languageCode);
    await cacheService.set(cacheKey, tree, 86400); // Cache for 24 hours
    return tree;
  }

  buildLocalizedTree(categories, languageCode, parentId = null) {
    const tree = [];
    for (const category of categories) {
      if (category.parent_id === parentId) {
        const children = this.buildLocalizedTree(categories, languageCode, category.id);
        if (children.length) {
          category.children = children;
        }

        // Use translated fields if available
        if (category.translated_name) {
          category.name = category.translated_name;
          category.description = category.translated_description;
        }

        tree.push(category);
      }
    }
    return tree;
  }

  // ==================== VERSIONING & HISTORY ====================

  async getCategoryHistory(categoryId) {
    const [history] = await this.pool.execute(
      `
      SELECT * FROM category_versions
      WHERE category_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `,
      [categoryId]
    );
    return history;
  }

  async rollbackCategoryVersion(versionId) {
    return withTransaction(async (connection) => {
      // Get the version data
      const [version] = await connection.execute(
        `
        SELECT * FROM category_versions WHERE id = ?
      `,
        [versionId]
      );

      if (!version.length) throw new AppError('Version not found', 404);

      // Create new version before rollback
      await connection.execute(
        `
        INSERT INTO category_versions (category_id, name, slug, description, image_url, meta_title, meta_description, meta_keywords)
        SELECT id, name, slug, description, image_url, meta_title, meta_description, meta_keywords
        FROM categories WHERE id = ?
      `,
        [version[0].category_id]
      );

      // Perform rollback
      const [result] = await connection.execute(
        `
        UPDATE categories SET
          name = ?,
          slug = ?,
          description = ?,
          image_url = ?,
          meta_title = ?,
          meta_description = ?,
          meta_keywords = ?
        WHERE id = ?
      `,
        [
          version[0].name,
          version[0].slug,
          version[0].description,
          version[0].image_url,
          version[0].meta_title,
          version[0].meta_description,
          version[0].meta_keywords,
          version[0].category_id,
        ]
      );

      // Invalidate cache
      await cacheService.clearByPattern(`category:${version[0].category_id}:*`);
      await cacheService.clearByPattern('category_tree:*');
      return result.affectedRows;
    });
  }

  // ==================== USER ENGAGEMENT METRICS ====================

  async getEngagementMetrics(categoryId) {
    const [results] = await this.pool.execute(
      `
      SELECT
        COUNT(DISTINCT pv.user_id) as unique_visitors,
        COUNT(pv.id) as total_views,
        AVG(pv.duration_seconds) as avg_time_spent,
        COUNT(DISTINCT CASE WHEN ci.id IS NOT NULL THEN pv.user_id END) as users_added_to_cart,
        COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN pv.user_id END) as users_purchased,
        COUNT(DISTINCT CASE WHEN f.id IS NOT NULL THEN pv.user_id END) as users_favorited
      FROM product_views pv
      JOIN product_categories pc ON pv.product_id = pc.product_id
      LEFT JOIN cart_items ci ON pv.product_id = ci.product_id AND ci.created_at >= pv.viewed_at
      LEFT JOIN order_items oi ON ci.id = oi.cart_item_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN favorites f ON pv.product_id = f.product_id AND f.user_id = pv.user_id
      WHERE pc.category_id = ?
        AND pv.viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `,
      [categoryId]
    );

    return results[0] || null;
  }

  async getConversionFunnel(categoryId) {
    const [results] = await this.pool.execute(
      `
      SELECT
        COUNT(DISTINCT pv.session_id) as views,
        COUNT(DISTINCT CASE WHEN ci.id IS NOT NULL THEN pv.session_id END) as carts,
        COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN pv.session_id END) as orders,
        COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN pv.user_id END) as unique_buyers,
        (COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN pv.session_id END) / 
         NULLIF(COUNT(DISTINCT pv.session_id), 0)) * 100 as conversion_rate
      FROM product_views pv
      JOIN product_categories pc ON pv.product_id = pc.product_id
      LEFT JOIN cart_items ci ON pv.product_id = ci.product_id AND ci.created_at >= pv.viewed_at
      LEFT JOIN order_items oi ON ci.id = oi.cart_item_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE pc.category_id = ?
        AND pv.viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `,
      [categoryId]
    );

    return results[0] || null;
  }

  async deleteCategoryBanner(bannerId) {
    const [result] = await this.pool.execute('DELETE FROM category_banners WHERE id = ?', [
      bannerId,
    ]);
    await cacheService.clearByPattern('category:*'); // Invalidate relevant caches
    return result.affectedRows > 0;
  }

  async removeProductsFromCategory(categoryId, productIds) {
    const [result] = await this.pool.execute(
      'DELETE FROM product_categories WHERE category_id = ? AND product_id IN (?)',
      [categoryId, productIds]
    );
    await cacheService.clearByPattern(`category:${categoryId}:*`);
    return result.affectedRows;
  }
}

module.exports = Category;
