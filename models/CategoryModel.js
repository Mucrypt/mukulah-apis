class Category {
  constructor(pool) {
    this.pool = pool;
  }

  async create({ name, slug, description = null, imageUrl = null, parentId = null }) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // Get parent's left value if exists
      let left = 1;
      if (parentId) {
        const [parent] = await connection.execute('SELECT lft, rgt FROM categories WHERE id = ?', [
          parentId,
        ]);
        if (parent.length === 0) throw new Error('Parent category not found');
        left = parent[0].rgt;
      }

      // Make space for the new node
      await connection.execute('UPDATE categories SET rgt = rgt + 2 WHERE rgt >= ?', [left]);
      await connection.execute('UPDATE categories SET lft = lft + 2 WHERE lft > ?', [left]);

      // Insert the new category
      const [result] = await connection.execute(
        `INSERT INTO categories SET
          name = :name,
          slug = :slug,
          description = :description,
          image_url = :imageUrl,
          parent_id = :parentId,
          lft = :left,
          rgt = :right,
          depth = :depth
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

      await connection.commit();
      return result.insertId;
    } catch (err) {
      if (connection) await connection.rollback();
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async getDepth(categoryId) {
    const [rows] = await this.pool.execute('SELECT depth FROM categories WHERE id = ?', [
      categoryId,
    ]);
    return rows[0]?.depth || 0;
  }

  async findById(id, withChildren = false, withProducts = false) {
    const [rows] = await this.pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
    if (rows.length === 0) return null;

    const category = rows[0];
    if (withChildren) {
      category.children = await this.getChildren(id);
    }
    if (withProducts) {
      category.products = await this.getCategoryProducts(id);
    }
    return category;
  }

  async getChildren(parentId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM categories WHERE parent_id = ? ORDER BY name',
      [parentId]
    );
    return rows;
  }

  async getCategoryProducts(categoryId) {
    const [rows] = await this.pool.execute(
      `SELECT p.* FROM products p
       JOIN product_categories pc ON p.id = pc.product_id
       WHERE pc.category_id = ? AND p.status = 'published'
       ORDER BY p.created_at DESC`,
      [categoryId]
    );
    return rows;
  }

  async getFullTree() {
    const [rows] = await this.pool.execute('SELECT * FROM categories ORDER BY lft');
    return this.buildTree(rows);
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

  async update(id, updates) {
    const [result] = await this.pool.execute(
      `UPDATE categories SET
        name = COALESCE(:name, name),
        slug = COALESCE(:slug, slug),
        description = COALESCE(:description, description),
        image_url = COALESCE(:imageUrl, image_url),
        status = COALESCE(:status, status),
        meta_title = COALESCE(:metaTitle, meta_title),
        meta_description = COALESCE(:metaDescription, meta_description),
        meta_keywords = COALESCE(:metaKeywords, meta_keywords)
      WHERE id = :id`,
      { ...updates, id }
    );
    return result.affectedRows;
  }

  async delete(id) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // Get category bounds
      const [category] = await connection.execute('SELECT lft, rgt FROM categories WHERE id = ?', [
        id,
      ]);
      if (category.length === 0) throw new Error('Category not found');

      const { lft, rgt } = category[0];
      const width = rgt - lft + 1;

      // Delete the category and its descendants
      await connection.execute('DELETE FROM categories WHERE lft BETWEEN ? AND ?', [lft, rgt]);

      // Close the gap
      await connection.execute('UPDATE categories SET rgt = rgt - ? WHERE rgt > ?', [width, rgt]);
      await connection.execute('UPDATE categories SET lft = lft - ? WHERE lft > ?', [width, rgt]);

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

module.exports = Category;
