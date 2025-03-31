// models/ProductAttributeValueModel.js
class ProductAttributeValue {
  constructor(pool) {
    this.pool = pool;
  }

  async create({ product_attribute_id, attribute_value_id }) {
    const [result] = await this.pool.execute(
      'INSERT INTO product_attribute_values (product_attribute_id, attribute_value_id) VALUES (?, ?)',
      [product_attribute_id, attribute_value_id]
    );
    return result.insertId;
  }

  // Add other methods as needed
}

module.exports = ProductAttributeValue;
