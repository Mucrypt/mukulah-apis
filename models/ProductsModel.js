// backend/models/ProductsModel.js
class Product {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Create a new product
   */
  async create(productData) {
    const [result] = await this.pool.execute(
      `INSERT INTO products SET
        name = :name,
        slug = :slug,
        description = :description,
        price = :price,
        sku = :sku,
        brand_id = :brandId,
        status = :status
      `,
      {
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        price: productData.price,
        sku: productData.sku,
        brandId: productData.brandId || null,
        status: productData.status || 'draft',
      }
    );
    return result.insertId;
  }

  /**
   * Find product by ID with full details
   */
  async findById(id, options = {}) {
    const {
      withImages = false,
      withCategories = false,
      withCollections = false,
      withAttributes = false,
      withVariations = false,
    } = options;

    const [rows] = await this.pool.execute(`SELECT * FROM products WHERE id = ?`, [id]);

    if (rows.length === 0) return null;

    const product = rows[0];

    // Eager loading of related data
    if (withImages) {
      product.images = await this.getProductImages(id);
    }

    if (withCategories) {
      product.categories = await this.getProductCategories(id);
    }

    if (withCollections) {
      product.collections = await this.getProductCollections(id);
    }

    if (withAttributes) {
      product.attributes = await this.getProductAttributes(id);
    }

    if (withVariations) {
      product.variations = await this.getProductVariations(id);
    }

    return product;
  }

  /**
   * Search products with filters
   */
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

  // Additional methods would be implemented similarly
  async getProductImages(productId) {
    /* ... */
  }
  async getProductCategories(productId) {
    /* ... */
  }
  async getProductCollections(productId) {
    /* ... */
  }
  async getProductAttributes(productId) {
    /* ... */
  }
  async getProductVariations(productId) {
    /* ... */
  }
  async update(id, updates) {
    /* ... */
  }
  async delete(id) {
    /* ... */
  }
}

module.exports = Product;
