class Brand {
  constructor(pool) {
    this.pool = pool;
  }

  async create({ name, slug, description = null, logoUrl = null, websiteUrl = null }) {
    const [result] = await this.pool.execute(
      `INSERT INTO brands SET
        name = :name,
        slug = :slug,
        description = :description,
        logo_url = :logoUrl,
        website_url = :websiteUrl
      `,
      { name, slug, description, logoUrl, websiteUrl }
    );
    return result.insertId;
  }

  async findById(id, withProducts = false) {
    const [rows] = await this.pool.execute('SELECT * FROM brands WHERE id = ?', [id]);
    if (rows.length === 0) return null;

    const brand = rows[0];
    if (withProducts) {
      brand.products = await this.getBrandProducts(id);
    }
    return brand;
  }

  async findAll({ featuredOnly = false } = {}) {
    const whereClause = featuredOnly ? 'WHERE is_featured = TRUE' : '';
    const [rows] = await this.pool.execute(`SELECT * FROM brands ${whereClause} ORDER BY name`);
    return rows;
  }

  async getBrandProducts(brandId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM products WHERE brand_id = ? AND status = "published" ORDER BY created_at DESC',
      [brandId]
    );
    return rows;
  }

  async update(id, updates) {
    const [result] = await this.pool.execute(
      `UPDATE brands SET
        name = COALESCE(:name, name),
        slug = COALESCE(:slug, slug),
        description = COALESCE(:description, description),
        logo_url = COALESCE(:logoUrl, logo_url),
        website_url = COALESCE(:websiteUrl, website_url),
        is_featured = COALESCE(:isFeatured, is_featured),
        status = COALESCE(:status, status)
      WHERE id = :id`,
      { ...updates, id }
    );
    return result.affectedRows;
  }

  async delete(id) {
    const [result] = await this.pool.execute('DELETE FROM brands WHERE id = ?', [id]);
    return result.affectedRows;
  }
}

module.exports = Brand;
