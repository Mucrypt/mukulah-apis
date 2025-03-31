class ProductVariation {
  constructor(pool) {
    this.pool = pool;
    this.attributeModel = new (require('./AttributeModel'))(pool);
    this.attributeValueModel = new (require('./AttributeValueModel'))(pool);
  }

  async create({ productId, sku, price, stockQuantity, attributes }) {
    const [result] = await this.pool.execute(
      `INSERT INTO product_variations (product_id, sku, price, stock_quantity) VALUES (?, ?, ?, ?)`,
      [productId, sku, price, stockQuantity]
    );
    const variationId = result.insertId;

    // Insert variation attributes
    if (attributes && attributes.length > 0) {
      for (const { attributeId, valueId } of attributes) {
        if (!attributeId) {
          throw new Error(`Missing attributeId: attributeId=${attributeId}`);
        }
        if (!valueId) {
          throw new Error(`Missing valueId: valueId=${valueId}`);
        }

        // Find the attribute value
        const attribute = await this.attributeModel.findById(attributeId);
        if (!attribute) {
          throw new Error(`Attribute not found: ${attributeId}`);
        }

        const attributeValues = await this.attributeValueModel.findByAttribute(attributeId);
        const attributeValue = attributeValues.find((av) => av.slug === valueId);

        if (!attributeValue) {
          throw new Error(`Attribute value not found for attribute ${attributeId}: ${valueId}`);
        }

        await this.pool.execute(
          `INSERT INTO variation_attributes (variation_id, attribute_id, value_id, attribute_value_id) VALUES (?, ?, ?, ?)`,
          [variationId, attributeId, valueId, attributeValue.id]
        );
      }
    }

    return variationId;
  }
  async findByProductId(productId) {
    const [rows] = await this.pool.execute(
      `SELECT * FROM product_variations WHERE product_id = ?`,
      [productId]
    );
    return rows;
  }

  async delete(variationId) {
    await this.pool.execute(`DELETE FROM variation_attributes WHERE variation_id = ?`, [
      variationId,
    ]);
    const [result] = await this.pool.execute(`DELETE FROM product_variations WHERE id = ?`, [
      variationId,
    ]);
    return result.affectedRows;
  }
}

module.exports = ProductVariation;
