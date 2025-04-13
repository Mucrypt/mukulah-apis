const { Pool } = require('../config/db'); // 
// backend/models/ProductVariationModel.js
const { sequelize } = require('../config/db');
const ProductVariation = require('./entities/ProductVariation');
const VariationAttribute = require('./entities/VariationAttribute');
class ProductVariationMode {
  constructor(pool) {
    this.pool = pool;
    this.attributeModel = new (require('./AttributeModel'))(pool);
    this.attributeValueModel = new (require('./AttributeValueModel'))(pool);
  }

  async create({
    productId,
    sku,
    price,
    discountPrice,
    stockQuantity,
    imageId,
    isDefault,
    attributes,
  }) {
    // Convert undefined values to null for SQL
    const safeDiscountPrice = discountPrice !== undefined ? discountPrice : null;
    const safeImageId = imageId !== undefined ? imageId : null;
    const safeIsDefault = isDefault !== undefined ? isDefault : false;

    const [result] = await this.pool.execute(
      `INSERT INTO product_variations 
       (product_id, sku, price, discount_price, stock_quantity, image_id, is_default) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productId, sku, price, safeDiscountPrice, stockQuantity, safeImageId, safeIsDefault]
    );
    const variationId = result.insertId;

    if (attributes && attributes.length > 0) {
      for (const { attributeId, valueId } of attributes) {
        if (!attributeId || !valueId) {
          throw new Error('Both attributeId and valueId are required');
        }

        // First try to find by ID
        let attributeValue = await this.attributeValueModel.findById(valueId);

        if (!attributeValue) {
          // If not found by ID, try to find by slug within the attribute
          const attributeValues = await this.attributeValueModel.findByAttribute(attributeId);
          attributeValue = attributeValues.find((av) => av.slug === valueId || av.id == valueId);
        }

        if (!attributeValue) {
          throw new Error(`Attribute value not found for attribute ${attributeId}: ${valueId}`);
        }

        await this.pool.execute(
          `INSERT INTO variation_attributes 
   (product_variation_id, attribute_id, value_id, attribute_value_id) 
   VALUES (?, ?, ?, ?)`,
          [variationId, attributeId, attributeValue.id, attributeValue.id]
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

  async findByProductIdWithDetails(productId) {
    const [rows] = await this.pool.execute(
      `SELECT pv.*, 
       GROUP_CONCAT(CONCAT(a.name, ':', av.value) SEPARATOR '|') as attribute_values
       FROM product_variations pv
       LEFT JOIN variation_attributes va ON pv.id = va.variation_id
       LEFT JOIN attributes a ON va.attribute_id = a.id
       LEFT JOIN attribute_values av ON va.value_id = av.id
       WHERE pv.product_id = ?
       GROUP BY pv.id`,
      [productId]
    );

    return rows.map((row) => ({
      ...row,
      attributes: row.attribute_values
        ? row.attribute_values.split('|').map((pair) => {
            const [name, value] = pair.split(':');
            return { name, value };
          })
        : [],
    }));
  }

  async findById(variationId) {
    const [rows] = await this.pool.execute(`SELECT * FROM product_variations WHERE id = ?`, [
      variationId,
    ]);
    return rows[0] || null;
  }

  async findBySku(sku) {
    const [rows] = await this.pool.execute(
      `SELECT id, product_id AS productId FROM product_variations WHERE sku = ?`,
      [sku]
    );
    return rows[0] || null;
  }

  async setAsDefault(variationId, productId) {
    await this.pool.execute(`UPDATE product_variations SET is_default = 0 WHERE product_id = ?`, [
      productId,
    ]);

    const [result] = await this.pool.execute(
      `UPDATE product_variations SET is_default = 1 WHERE id = ? AND product_id = ?`,
      [variationId, productId]
    );
    return result.affectedRows;
  }

  async update(variationId, updates) {
    const validFields = [
      'sku',
      'price',
      'discount_price',
      'stock_quantity',
      'image_id',
      'is_default',
      'stock_status',
    ];

    const filteredUpdates = Object.keys(updates)
      .filter((key) => validFields.includes(key))
      .reduce((obj, key) => {
        // Convert undefined to null for nullable fields
        if (updates[key] === undefined) {
          if (key === 'is_default') {
            obj[key] = false;
          } else {
            obj[key] = null;
          }
        } else {
          obj[key] = updates[key];
        }
        return obj;
      }, {});

    if (Object.keys(filteredUpdates).length === 0) {
      return 0;
    }

    const [result] = await this.pool.execute(`UPDATE product_variations SET ? WHERE id = ?`, [
      filteredUpdates,
      variationId,
    ]);
    return result.affectedRows;
  }

  async updateStock(variationId, quantity, connection = null) {
    if (quantity === undefined || quantity === null) {
      throw new Error('Quantity must not be null or undefined');
    }

    const conn = connection || this.pool;
    const [result] = await conn.execute(
      `UPDATE product_variations SET stock_quantity = ? WHERE id = ?`,
      [quantity, variationId]
    );
    return result.affectedRows;
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

  async updateStatus(variationId, status) {
    const [result] = await this.pool.execute(
      `UPDATE product_variations SET stock_status = ? WHERE id = ?`,
      [status, variationId]
    );
    return result.affectedRows;
  }

  async updateImage(variationId, imageId) {
    const [result] = await this.pool.execute(
      `UPDATE product_variations SET image_id = ? WHERE id = ?`,
      [imageId, variationId]
    );
    return result.affectedRows;
  }
}

module.exports = ProductVariation;
// This code defines a ProductVariation class that interacts with a MySQL database to manage product variations.
