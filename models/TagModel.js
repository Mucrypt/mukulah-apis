class Tag {
  constructor(pool) {
    this.pool = pool;
  }

  async create({ name, slug }) {
    const [result] = await this.pool.execute('INSERT INTO tags (name, slug) VALUES (?, ?)', [
      name,
      slug,
    ]);
    return result.insertId;
  }

  async findById(id) {
    const [rows] = await this.pool.execute('SELECT * FROM tags WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async findBySlug(slug) {
    const [rows] = await this.pool.execute('SELECT * FROM tags WHERE slug = ?', [slug]);
    return rows[0] || null;
  }

  async findAll({ popularOnly = false, limit = 50 } = {}) {
    let query = 'SELECT * FROM tags';
    if (popularOnly) {
      query = `SELECT t.*, COUNT(pt.product_id) as product_count 
               FROM tags t
               LEFT JOIN product_tags pt ON t.id = pt.tag_id
               GROUP BY t.id
               ORDER BY product_count DESC`;
    }
    query += ` LIMIT ${limit}`;

    const [rows] = await this.pool.execute(query);
    return rows;
  }

  async getProductsByTag(tagId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [products] = await this.pool.execute(
      `SELECT p.* FROM products p
       JOIN product_tags pt ON p.id = pt.product_id
       WHERE pt.tag_id = ? AND p.status = 'published'
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [tagId, limit, offset]
    );

    const [count] = await this.pool.execute(
      `SELECT COUNT(*) as total FROM product_tags WHERE tag_id = ?`,
      [tagId]
    );

    return {
      products,
      total: count[0].total,
      page,
      limit,
    };
  }

  async addToProduct(productId, tagId) {
    const [result] = await this.pool.execute(
      'INSERT IGNORE INTO product_tags (product_id, tag_id) VALUES (?, ?)',
      [productId, tagId]
    );
    return result.affectedRows;
  }

  async removeFromProduct(productId, tagId) {
    const [result] = await this.pool.execute(
      'DELETE FROM product_tags WHERE product_id = ? AND tag_id = ?',
      [productId, tagId]
    );
    return result.affectedRows;
  }

  async update(id, { name, slug }) {
    const [result] = await this.pool.execute('UPDATE tags SET name = ?, slug = ? WHERE id = ?', [
      name,
      slug,
      id,
    ]);
    return result.affectedRows;
  }

  async delete(id) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      await connection.execute('DELETE FROM product_tags WHERE tag_id = ?', [id]);

      const [result] = await connection.execute('DELETE FROM tags WHERE id = ?', [id]);

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

module.exports = Tag;
