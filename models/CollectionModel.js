class Collection {
  constructor(pool) {
    this.pool = pool;
  }

  async create({
    name,
    slug,
    description = null,
    imageUrl = null,
    categoryId,
    startDate = null,
    endDate = null,
  }) {
    const [result] = await this.pool.execute(
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
    return result.insertId;
  }

  async findById(id, withProducts = false) {
    const [rows] = await this.pool.execute('SELECT * FROM collections WHERE id = ?', [id]);
    if (rows.length === 0) return null;

    const collection = rows[0];
    if (withProducts) {
      collection.products = await this.getCollectionProducts(id);
    }
    return collection;
  }

  async findByCategory(categoryId, { activeOnly = true } = {}) {
    let whereClause = 'WHERE category_id = ?';
    const params = [categoryId];

    if (activeOnly) {
      whereClause +=
        ' AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())';
    }

    const [rows] = await this.pool.execute(
      `SELECT * FROM collections ${whereClause} ORDER BY is_featured DESC, name`,
      params
    );
    return rows;
  }

  async getCollectionProducts(collectionId) {
    const [rows] = await this.pool.execute(
      `SELECT p.* FROM products p
       JOIN product_collections pc ON p.id = pc.product_id
       WHERE pc.collection_id = ? AND p.status = 'published'
       ORDER BY pc.position, p.created_at DESC`,
      [collectionId]
    );
    return rows;
  }

  async getActiveCollections() {
    const [rows] = await this.pool.execute(
      `SELECT * FROM collections
       WHERE (start_date IS NULL OR start_date <= NOW())
       AND (end_date IS NULL OR end_date >= NOW())
       ORDER BY is_featured DESC, name`
    );
    return rows;
  }

  async update(id, updates) {
    const [result] = await this.pool.execute(
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
    return result.affectedRows;
  }

  async delete(id) {
    const [result] = await this.pool.execute('DELETE FROM collections WHERE id = ?', [id]);
    return result.affectedRows;
  }
}

module.exports = Collection;
