class Product {
  constructor(pool) {
    this.pool = pool;
  }

  async create(productData) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO products (
    name, slug, description, short_description, price, discount_price, cost_price,
    sku, upc, ean, isbn, brand_id, stock_quantity, stock_status,
    weight, length, width, height, min_order_quantity, status,
    is_featured, is_bestseller, is_new, needs_shipping, tax_class,
    meta_title, meta_description, meta_keywords
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productData.name,
          productData.slug,
          productData.description,
          productData.shortDescription || null,
          productData.price,
          productData.discountPrice || 0.0,
          productData.costPrice || null,
          productData.sku,
          productData.upc || null,
          productData.ean || null,
          productData.isbn || null,
          productData.brandId || null,
          productData.stockQuantity || 0,
          productData.stockStatus || 'in_stock',
          productData.weight || null,
          productData.length || null,
          productData.width || null,
          productData.height || null,
          productData.minOrderQuantity || 1,
          productData.status || 'draft',
          productData.isFeatured ? 1 : 0,
          productData.isBestseller ? 1 : 0,
          productData.isNew ? 1 : 0,
          productData.needsShipping !== false ? 1 : 0,
          productData.taxClass || null,
          productData.metaTitle || null,
          productData.metaDescription || null,
          productData.metaKeywords || null,
        ]
      );

      const productId = result.insertId;

      if (productData.categories && productData.categories.length > 0) {
        await this.addCategories(connection, productId, productData.categories);
      }

      if (productData.collections && productData.collections.length > 0) {
        await this.addCollections(connection, productId, productData.collections);
      }

      if (productData.attributes && productData.attributes.length > 0) {
        await this.addAttributes(productId, productData.attributes, connection);
      }

      await connection.commit();
      return productId;
    } catch (err) {
      if (connection) await connection.rollback();
      console.error('Error creating product:', err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async addCategories(connection, productId, categories) {
    const values = categories.map((catId) => [productId, catId]);
    await connection.query('INSERT INTO product_categories (product_id, category_id) VALUES ?', [
      values,
    ]);
  }

  async addCollections(connection, productId, collections) {
    const values = collections.map((colId) => [productId, colId]);
    await connection.query('INSERT INTO product_collections (product_id, collection_id) VALUES ?', [
      values,
    ]);
  }

  async addAttributes(productId, attributes, connection) {
    if (!Array.isArray(attributes)) {
      throw new Error('Attributes must be an array');
    }

    for (const attribute of attributes) {
      const { attributeId, valueIds } = attribute;

      if (!attributeId || !Array.isArray(valueIds) || valueIds.length === 0) {
        throw new Error(
          'Invalid attribute format: Each attribute must have an attributeId and a non-empty array of valueIds'
        );
      }

      const [result] = await connection.execute(
        'INSERT INTO product_attributes (product_id, attribute_id) VALUES (?, ?)',
        [productId, attributeId]
      );

      const productAttributeId = result.insertId;

      for (const valueId of valueIds) {
        await connection.execute(
          'INSERT INTO product_attribute_values (product_attribute_id, attribute_value_id) VALUES (?, ?)',
          [productAttributeId, valueId]
        );
      }
    }
  }

  async findById(id, options = {}) {
    const {
      withImages = false,
      withCategories = false,
      withCollections = false,
      withAttributes = false,
      withVariations = false,
      withReviews = false,
    } = options;

    const [rows] = await this.pool.execute('SELECT * FROM products WHERE id = ?', [id]);
    if (rows.length === 0) return null;

    const product = rows[0];
    const promises = [];

    if (options.withBrand && product.brand_id) {
      const brandModel = new (require('./BrandModel'))(this.pool);
      promises.push(
        brandModel.findById(product.brand_id).then((brand) => {
          product.brand = brand;
        })
      );
    }

    if (withImages) {
      promises.push(
        this.getProductImages(id).then((images) => {
          product.images = images;
        })
      );
    }

    if (withCategories) {
      promises.push(
        this.getProductCategories(id).then((categories) => {
          product.categories = categories;
        })
      );
    }

    if (withCollections) {
      promises.push(
        this.getProductCollections(id).then((collections) => {
          product.collections = collections;
        })
      );
    }

    if (withAttributes) {
      promises.push(
        this.getProductAttributes(id).then((attributes) => {
          product.attributes = attributes;
        })
      );
    }

    if (withVariations) {
      promises.push(
        this.getProductVariations(id).then((variations) => {
          product.variations = variations;
        })
      );
    }

    if (withReviews) {
      promises.push(
        this.getProductReviews(id).then((reviews) => {
          product.reviews = reviews;
        })
      );
    }

    await Promise.all(promises);
    return product;
  }

  async getProductImages(productId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY position',
      [productId]
    );
    return rows;
  }

  async getProductCategories(productId) {
    const [rows] = await this.pool.execute(
      `SELECT c.* FROM categories c
       JOIN product_categories pc ON c.id = pc.category_id
       WHERE pc.product_id = ?`,
      [productId]
    );
    return rows;
  }

  async getProductCollections(productId) {
    const [rows] = await this.pool.execute(
      `SELECT col.* FROM collections col
       JOIN product_collections pc ON col.id = pc.collection_id
       WHERE pc.product_id = ?`,
      [productId]
    );
    return rows;
  }

  async getProductAttributes(productId) {
    const [rows] = await this.pool.execute(
      `SELECT 
      a.id, a.name, a.slug, a.type,
      GROUP_CONCAT(av.id) AS value_ids,
      GROUP_CONCAT(av.value) AS attribute_values,
      GROUP_CONCAT(av.slug) AS value_slugs,
      GROUP_CONCAT(av.color_code) AS color_codes,
      GROUP_CONCAT(av.image_url) AS image_urls
    FROM product_attributes pa
    JOIN attributes a ON pa.attribute_id = a.id
    JOIN product_attribute_values pav ON pa.id = pav.product_attribute_id
    JOIN attribute_values av ON pav.attribute_value_id = av.id
    WHERE pa.product_id = ?
    GROUP BY a.id`,
      [productId]
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      type: row.type,
      values: row.value_ids.split(',').map((id, index) => ({
        id: parseInt(id),
        value: row.attribute_values.split(',')[index],
        slug: row.value_slugs.split(',')[index],
        colorCode: row.color_codes?.split(',')[index] || null,
        imageUrl: row.image_urls?.split(',')[index] || null,
      })),
    }));
  }

  async getProductVariations(productId) {
    const [rows] = await this.pool.execute(
      `SELECT v.*, 
        GROUP_CONCAT(CONCAT(a.name, ':', av.value)) AS variation_attributes
      FROM product_variations v
      LEFT JOIN variation_attributes va ON v.id = va.variation_id
      LEFT JOIN attributes a ON va.attribute_id = a.id
      LEFT JOIN attribute_values av ON va.attribute_value_id = av.id
      WHERE v.product_id = ?
      GROUP BY v.id`,
      [productId]
    );

    return rows.map((row) => ({
      ...row,
      attributes: row.variation_attributes
        ? row.variation_attributes.split(',').map((attr) => {
            const [name, value] = attr.split(':');
            return { name, value };
          })
        : [],
    }));
  }

  async getProductReviews(productId, { approvedOnly = true } = {}) {
    const whereClause = approvedOnly ? 'AND is_approved = TRUE' : '';
    const [rows] = await this.pool.execute(
      `SELECT r.*, 
        (SELECT COUNT(*) FROM review_helpfulness rh WHERE rh.review_id = r.id AND rh.is_helpful = TRUE) AS helpful_count,
        (SELECT COUNT(*) FROM review_helpfulness rh WHERE rh.review_id = r.id AND rh.is_helpful = FALSE) AS not_helpful_count
      FROM product_reviews r
      WHERE r.product_id = ? ${whereClause}
      ORDER BY r.created_at DESC`,
      [productId]
    );
    return rows;
  }

  async search({
    query,
    categoryId,
    collectionId,
    brandId,
    minPrice,
    maxPrice,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    limit = 20,
    offset = 0,
  }) {
    try {
      let whereClauses = ['p.status = "published"'];
      const params = [];

      if (query) {
        whereClauses.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku = ?)');
        params.push(`%${query}%`, `%${query}%`, query);
      }

      if (categoryId) {
        whereClauses.push('pc.category_id = ?');
        params.push(categoryId);
      }

      if (collectionId) {
        whereClauses.push('pcol.collection_id = ?');
        params.push(collectionId);
      }

      if (brandId) {
        whereClauses.push('p.brand_id = ?');
        params.push(brandId);
      }

      if (minPrice) {
        whereClauses.push('COALESCE(p.discount_price, p.price) >= ?');
        params.push(minPrice);
      }

      if (maxPrice) {
        whereClauses.push('COALESCE(p.discount_price, p.price) <= ?');
        params.push(maxPrice);
      }

      let joinClause = '';
      if (categoryId) {
        joinClause += 'JOIN product_categories pc ON p.id = pc.product_id ';
      }
      if (collectionId) {
        joinClause += 'JOIN product_collections pcol ON p.id = pcol.product_id ';
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const validSortColumns = ['name', 'price', 'created_at', 'average_rating', 'sales_count'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const limitNum = parseInt(limit, 10);
      const offsetNum = parseInt(offset, 10);

      if (isNaN(limitNum) || isNaN(offsetNum)) {
        throw new Error('Invalid limit or offset value');
      }

      // Make sure this comes *after* whereClause is defined
      // Make sure this comes *after* whereClause is defined
      const sqlQuery = `SELECT DISTINCT p.* FROM products p
  ${joinClause}
  ${whereClause}
  ORDER BY ${sortColumn} ${sortDirection}
  LIMIT ${limitNum} OFFSET ${offsetNum}`;

      console.log('Executing SQL:', sqlQuery);
      console.log('With params:', params);

      const [products] = await this.pool.execute(sqlQuery, params);

      const countSql = `SELECT COUNT(DISTINCT p.id) as total FROM products p
        ${joinClause}
        ${whereClause}`;

      const [countResult] = await this.pool.execute(countSql, params);

      return {
        products,
        total: countResult[0].total,
        limit: limitNum,
        offset: offsetNum,
      };
    } catch (err) {
      console.error('Error in product search:', err);
      throw err;
    }
  }

  async update(id, updates) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      const fields = [];
      const params = [];

      // Dynamically build the update query for all fields
      const updatableFields = [
        'name',
        'slug',
        'description',
        'short_description',
        'price',
        'discount_price',
        'cost_price',
        'sku',
        'upc',
        'ean',
        'isbn',
        'brand_id',
        'stock_quantity',
        'stock_status',
        'weight',
        'length',
        'width',
        'height',
        'min_order_quantity',
        'status',
        'is_featured',
        'is_bestseller',
        'is_new',
        'needs_shipping',
        'tax_class',
        'views_count',
        'sales_count',
        'wishlist_count',
        'rating_total',
        'rating_count',
        'average_rating',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'created_at',
        'updated_at',
      ];

      for (const field of updatableFields) {
        if (updates[field] !== undefined) {
          fields.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }

      if (fields.length === 0) {
        throw new Error(
          'No valid fields provided for update. Ensure you are passing valid fields.'
        );
      }

      params.push(id);
      const query = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;

      const [result] = await connection.execute(query, params);

      if (updates.categories !== undefined) {
        await connection.execute('DELETE FROM product_categories WHERE product_id = ?', [id]);
        if (updates.categories.length > 0) {
          await this.addCategories(connection, id, updates.categories);
        }
      }

      if (updates.collections !== undefined) {
        await connection.execute('DELETE FROM product_collections WHERE product_id = ?', [id]);
        if (updates.collections.length > 0) {
          await this.addCollections(connection, id, updates.collections);
        }
      }

      if (updates.attributes !== undefined) {
        await connection.execute('DELETE pa FROM product_attributes pa WHERE pa.product_id = ?', [
          id,
        ]);
        if (updates.attributes.length > 0) {
          await this.addAttributes(id, updates.attributes, connection);
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

  async delete(id) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      await connection.execute('DELETE FROM product_categories WHERE product_id = ?', [id]);
      await connection.execute('DELETE FROM product_collections WHERE product_id = ?', [id]);
      await connection.execute(
        'DELETE pav FROM product_attribute_values pav JOIN product_attributes pa ON pav.product_attribute_id = pa.id WHERE pa.product_id = ?',
        [id]
      );
      await connection.execute('DELETE FROM product_attributes WHERE product_id = ?', [id]);
      await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id]);
      await connection.execute('DELETE FROM product_videos WHERE product_id = ?', [id]);
      await connection.execute('DELETE FROM product_tags WHERE product_id = ?', [id]);
      await connection.execute(
        'DELETE FROM related_products WHERE product_id = ? OR related_product_id = ?',
        [id, id]
      );
      await connection.execute(
        'DELETE FROM cross_sell_products WHERE product_id = ? OR cross_sell_product_id = ?',
        [id, id]
      );
      await connection.execute(
        'DELETE FROM up_sell_products WHERE product_id = ? OR up_sell_product_id = ?',
        [id, id]
      );
      await connection.execute(
        'DELETE va FROM variation_attributes va JOIN product_variations pv ON va.variation_id = pv.id WHERE pv.product_id = ?',
        [id]
      );
      await connection.execute('DELETE FROM product_variations WHERE product_id = ?', [id]);

      const [result] = await connection.execute('DELETE FROM products WHERE id = ?', [id]);

      await connection.commit();
      return result.affectedRows;
    } catch (err) {
      if (connection) await connection.rollback();
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async incrementViews(productId) {
    await this.pool.execute('UPDATE products SET views_count = views_count + 1 WHERE id = ?', [
      productId,
    ]);
  }

  async incrementSales(productId, quantity = 1) {
    await this.pool.execute(
      'UPDATE products SET sales_count = sales_count + ?, stock_quantity = stock_quantity - ? WHERE id = ?',
      [quantity, quantity, productId]
    );
  }
}

module.exports = Product;
