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
        `INSERT INTO products SET
          name = :name,
          slug = :slug,
          description = :description,
          short_description = :shortDescription,
          price = :price,
          discount_price = :discountPrice,
          cost_price = :costPrice,
          sku = :sku,
          upc = :upc,
          ean = :ean,
          isbn = :isbn,
          brand_id = :brandId,
          stock_quantity = :stockQuantity,
          weight = :weight,
          length = :length,
          width = :width,
          height = :height,
          min_order_quantity = :minOrderQuantity,
          status = :status,
          is_featured = :isFeatured,
          is_bestseller = :isBestseller,
          is_new = :isNew,
          needs_shipping = :needsShipping,
          tax_class = :taxClass,
          meta_title = :metaTitle,
          meta_description = :metaDescription,
          meta_keywords = :metaKeywords
        `,
        {
          name: productData.name,
          slug: productData.slug,
          description: productData.description,
          shortDescription: productData.shortDescription || null,
          price: productData.price,
          discountPrice: productData.discountPrice || null,
          costPrice: productData.costPrice || null,
          sku: productData.sku,
          upc: productData.upc || null,
          ean: productData.ean || null,
          isbn: productData.isbn || null,
          brandId: productData.brandId || null,
          stockQuantity: productData.stockQuantity || 0,
          weight: productData.weight || null,
          length: productData.length || null,
          width: productData.width || null,
          height: productData.height || null,
          minOrderQuantity: productData.minOrderQuantity || 1,
          status: productData.status || 'draft',
          isFeatured: productData.isFeatured || false,
          isBestseller: productData.isBestseller || false,
          isNew: productData.isNew || false,
          needsShipping: productData.needsShipping !== false,
          taxClass: productData.taxClass || null,
          metaTitle: productData.metaTitle || null,
          metaDescription: productData.metaDescription || null,
          metaKeywords: productData.metaKeywords || null,
        }
      );

      const productId = result.insertId;

      // Handle categories if provided
      if (productData.categories && productData.categories.length > 0) {
        await this.addCategories(connection, productId, productData.categories);
      }

      // Handle collections if provided
      if (productData.collections && productData.collections.length > 0) {
        await this.addCollections(connection, productId, productData.collections);
      }

      // Handle attributes if provided
      if (productData.attributes && productData.attributes.length > 0) {
        await this.addAttributes(connection, productId, productData.attributes);
      }

      await connection.commit();
      return productId;
    } catch (err) {
      if (connection) await connection.rollback();
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

  async addAttributes(connection, productId, attributes) {
    for (const attr of attributes) {
      const [attrResult] = await connection.execute(
        'INSERT INTO product_attributes (product_id, attribute_id) VALUES (?, ?)',
        [productId, attr.attributeId]
      );

      const attributeValues = attr.values.map((valId) => [attrResult.insertId, valId]);
      if (attributeValues.length > 0) {
        await connection.query(
          'INSERT INTO product_attribute_values (product_attribute_id, attribute_value_id) VALUES ?',
          [attributeValues]
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

    // Eager loading of related data
    const promises = [];

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
        GROUP_CONCAT(av.value) AS values,
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
        value: row.values.split(',')[index],
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
    attributes,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    limit = 20,
    offset = 0,
  }) {
    let whereClauses = ['p.status = "published"'];
    const params = {};

    if (query) {
      whereClauses.push(`(p.name LIKE :query OR p.description LIKE :query OR p.sku = :query)`);
      params.query = `%${query}%`;
    }

    if (categoryId) {
      whereClauses.push(`pc.category_id = :categoryId`);
      params.categoryId = categoryId;
    }

    if (collectionId) {
      whereClauses.push(`pcol.collection_id = :collectionId`);
      params.collectionId = collectionId;
    }

    if (brandId) {
      whereClauses.push(`p.brand_id = :brandId`);
      params.brandId = brandId;
    }

    if (minPrice) {
      whereClauses.push(`COALESCE(p.discount_price, p.price) >= :minPrice`);
      params.minPrice = minPrice;
    }

    if (maxPrice) {
      whereClauses.push(`COALESCE(p.discount_price, p.price) <= :maxPrice`);
      params.maxPrice = maxPrice;
    }

    // Handle attribute filtering
    if (attributes && Object.keys(attributes).length > 0) {
      const attributeConditions = [];
      let attrIndex = 0;

      for (const [attrId, values] of Object.entries(attributes)) {
        if (values.length > 0) {
          const valuePlaceholders = values.map((v, i) => `:attr${attrIndex}_${i}`).join(',');
          attributeConditions.push(
            `EXISTS (
              SELECT 1 FROM product_attribute_values pav
              JOIN attribute_values av ON pav.attribute_value_id = av.id
              WHERE pav.product_attribute_id IN (
                SELECT pa.id FROM product_attributes pa
                WHERE pa.product_id = p.id AND pa.attribute_id = :attr${attrIndex}_id
              )
              AND av.id IN (${valuePlaceholders})
            )`
          );

          params[`attr${attrIndex}_id`] = attrId;
          values.forEach((value, i) => {
            params[`attr${attrIndex}_${i}`] = value;
          });
          attrIndex++;
        }
      }

      if (attributeConditions.length > 0) {
        whereClauses.push(`(${attributeConditions.join(' AND ')})`);
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Handle joins based on filters
    let joinClause = '';
    if (categoryId) {
      joinClause += 'JOIN product_categories pc ON p.id = pc.product_id ';
    }
    if (collectionId) {
      joinClause += 'JOIN product_collections pcol ON p.id = pcol.product_id ';
    }

    // Validate sort options
    const validSortColumns = ['name', 'price', 'created_at', 'average_rating', 'sales_count'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [products] = await this.pool.execute(
      `SELECT DISTINCT p.* FROM products p
       ${joinClause}
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT :limit OFFSET :offset`,
      { ...params, limit, offset }
    );

    // Get total count for pagination
    const [countResult] = await this.pool.execute(
      `SELECT COUNT(DISTINCT p.id) as total FROM products p
       ${joinClause}
       ${whereClause}`,
      params
    );

    return {
      products,
      total: countResult[0].total,
      limit,
      offset,
    };
  }

  async update(id, updates) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `UPDATE products SET
          name = COALESCE(:name, name),
          slug = COALESCE(:slug, slug),
          description = COALESCE(:description, description),
          short_description = COALESCE(:shortDescription, short_description),
          price = COALESCE(:price, price),
          discount_price = COALESCE(:discountPrice, discount_price),
          cost_price = COALESCE(:costPrice, cost_price),
          sku = COALESCE(:sku, sku),
          brand_id = COALESCE(:brandId, brand_id),
          stock_quantity = COALESCE(:stockQuantity, stock_quantity),
          weight = COALESCE(:weight, weight),
          length = COALESCE(:length, length),
          width = COALESCE(:width, width),
          height = COALESCE(:height, height),
          min_order_quantity = COALESCE(:minOrderQuantity, min_order_quantity),
          status = COALESCE(:status, status),
          is_featured = COALESCE(:isFeatured, is_featured),
          is_bestseller = COALESCE(:isBestseller, is_bestseller),
          is_new = COALESCE(:isNew, is_new),
          needs_shipping = COALESCE(:needsShipping, needs_shipping),
          tax_class = COALESCE(:taxClass, tax_class),
          meta_title = COALESCE(:metaTitle, meta_title),
          meta_description = COALESCE(:metaDescription, meta_description),
          meta_keywords = COALESCE(:metaKeywords, meta_keywords)
        WHERE id = :id`,
        { ...updates, id }
      );

      // Handle categories if provided
      if (updates.categories) {
        await connection.execute('DELETE FROM product_categories WHERE product_id = ?', [id]);
        if (updates.categories.length > 0) {
          await this.addCategories(connection, id, updates.categories);
        }
      }

      // Handle collections if provided
      if (updates.collections) {
        await connection.execute('DELETE FROM product_collections WHERE product_id = ?', [id]);
        if (updates.collections.length > 0) {
          await this.addCollections(connection, id, updates.collections);
        }
      }

      // Handle attributes if provided
      if (updates.attributes) {
        await connection.execute('DELETE pa FROM product_attributes pa WHERE pa.product_id = ?', [
          id,
        ]);
        if (updates.attributes.length > 0) {
          await this.addAttributes(connection, id, updates.attributes);
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

      // Delete product relationships
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

      // Delete product variations
      await connection.execute(
        'DELETE va FROM variation_attributes va JOIN product_variations pv ON va.variation_id = pv.id WHERE pv.product_id = ?',
        [id]
      );
      await connection.execute('DELETE FROM product_variations WHERE product_id = ?', [id]);

      // Finally delete the product
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
