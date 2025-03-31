//backend/models/AttributeModel.js
class Attribute {
  constructor(pool) {
    this.pool = pool;
  }

  async create({ name, slug, type, isFilterable = false, isVisible = true, isVariation = false }) {
    const [result] = await this.pool.execute(
      `INSERT INTO attributes SET
        name = :name,
        slug = :slug,
        type = :type,
        is_filterable = :isFilterable,
        is_visible = :isVisible,
        is_variation = :isVariation
      `,
      { name, slug, type, isFilterable, isVisible, isVariation }
    );
    return result.insertId;
  }

  async findById(id) {
    const [rows] = await this.pool.execute('SELECT * FROM attributes WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async findAll({ filterableOnly = false, variationOnly = false } = {}) {
    let whereClause = '';
    const params = {};

    if (filterableOnly) {
      whereClause = 'WHERE is_filterable = TRUE';
    } else if (variationOnly) {
      whereClause = 'WHERE is_variation = TRUE';
    }

    const [rows] = await this.pool.execute(
      `SELECT * FROM attributes ${whereClause} ORDER BY position`,
      params
    );
    return rows;
  }

  async update(id, updates) {
    const [result] = await this.pool.execute(
      `UPDATE attributes SET
        name = COALESCE(:name, name),
        slug = COALESCE(:slug, slug),
        type = COALESCE(:type, type),
        is_filterable = COALESCE(:isFilterable, is_filterable),
        is_visible = COALESCE(:isVisible, is_visible),
        is_variation = COALESCE(:isVariation, is_variation),
        position = COALESCE(:position, position)
      WHERE id = :id`,
      { ...updates, id }
    );
    return result.affectedRows;
  }

  async delete(id) {
    const [result] = await this.pool.execute('DELETE FROM attributes WHERE id = ?', [id]);
    return result.affectedRows;
  }
}

module.exports = Attribute;
