class AttributeValue {
  constructor(pool) {
    this.pool = pool;
  }

  async create({ attributeId, value, slug, colorCode = null, imageUrl = null }) {
    const [result] = await this.pool.execute(
      `INSERT INTO attribute_values SET
        attribute_id = :attributeId,
        value = :value,
        slug = :slug,
        color_code = :colorCode,
        image_url = :imageUrl
      `,
      { attributeId, value, slug, colorCode, imageUrl }
    );
    return result.insertId;
  }

  async findByAttribute(attributeId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM attribute_values WHERE attribute_id = ? ORDER BY position',
      [attributeId]
    );
    return rows;
  }

  async findById(valueId) {
    const [rows] = await this.pool.execute(`SELECT * FROM attribute_values WHERE id = ?`, [
      valueId,
    ]);
    return rows[0] || null;
  }

  async update(id, updates) {
    const [result] = await this.pool.execute(
      `UPDATE attribute_values SET
        value = COALESCE(:value, value),
        slug = COALESCE(:slug, slug),
        color_code = COALESCE(:colorCode, color_code),
        image_url = COALESCE(:imageUrl, image_url),
        position = COALESCE(:position, position)
      WHERE id = :id`,
      { ...updates, id }
    );
    return result.affectedRows;
  }

  async delete(id) {
    const [result] = await this.pool.execute('DELETE FROM attribute_values WHERE id = ?', [id]);
    return result.affectedRows;
  }
}

module.exports = AttributeValue;
