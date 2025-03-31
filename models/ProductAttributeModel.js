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

  async getAttributesByProductId(productId) {
    const [rows] = await this.pool.execute(
      `SELECT pa.id AS product_attribute_id, 
              a.name AS attribute_name, 
              av.value AS attribute_value, 
              av.slug AS attribute_value_slug
       FROM product_attributes pa
       JOIN attributes a ON pa.attribute_id = a.id
       JOIN product_attribute_values pav ON pav.product_attribute_id = pa.id
       JOIN attribute_values av ON pav.attribute_value_id = av.id
       WHERE pa.product_id = ?`,
      [productId]
    );
    console.log('Attributes for product:', productId, rows); // Debugging log
    return rows;
  }
}

class ProductAttributeModel {
  constructor(pool) {
    this.pool = pool;
  }

  async create({ productId, attributeId }) {
    if (!productId || !attributeId) {
      throw new Error(
        `Invalid parameters: productId (${productId}) and attributeId (${attributeId}) must be defined.`
      );
    }

    const [result] = await this.pool.execute(
      'INSERT INTO product_attributes (product_id, attribute_id) VALUES (?, ?)',
      [productId, attributeId]
    );
    return result.insertId;
  }

  async getAttributesByProductId(productId) {
    const query = `
      SELECT pa.attribute_id, a.name AS attribute_name, pav.attribute_value_id, av.value AS value_name
      FROM product_attributes pa
      JOIN attributes a ON pa.attribute_id = a.id
      JOIN product_attribute_values pav ON pa.id = pav.product_attribute_id
      JOIN attribute_values av ON pav.attribute_value_id = av.id
      WHERE pa.product_id = ?
    `;

    // Log the product ID being queried
    console.log('Querying attributes for product ID:', productId);

    const [rows] = await this.pool.execute(query, [productId]);

    // Log the raw query result
    console.log('Raw Query Result:', rows);

    const attributes = {};

    rows.forEach((row) => {
      if (!attributes[row.attribute_id]) {
        attributes[row.attribute_id] = {
          id: row.attribute_id,
          name: row.attribute_name,
          values: [],
        };
      }
      attributes[row.attribute_id].values.push({
        id: row.attribute_value_id,
        name: row.value_name,
      });
    });

    // Log the processed attributes
    console.log('Processed Attributes:', Object.values(attributes));

    return Object.values(attributes);
  }
}

module.exports = ProductAttributeModel;
