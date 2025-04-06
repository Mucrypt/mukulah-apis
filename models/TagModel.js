const { sequelize } = require('../config/db');
const Tag = require('./entities/Tag');
const Product = require('./entities/Product'); // Updated path
const ProductTag = require('./entities/ProductTag'); // Import ProductTag model

class TagModel {
  constructor() {
    this.Tag = Tag;
  }

  async create({ name, slug }) {
    const tag = await this.Tag.create({ name, slug });
    return tag.id;
  }

  async findById(id) {
    return await this.Tag.findByPk(id);
  }

  async findBySlug(slug) {
    return await this.Tag.findOne({ where: { slug } });
  }

  async findAll({ popularOnly = false, limit = 50 } = {}) {
    if (popularOnly) {
      return await this.Tag.findAll({
        attributes: {
          include: [
            [
              sequelize.literal(
                '(SELECT COUNT(*) FROM product_tags WHERE product_tags.tag_id = Tag.id)'
              ),
              'product_count',
            ],
          ],
        },
        order: [[sequelize.literal('product_count'), 'DESC']],
        limit: parseInt(limit, 10),
      });
    }
    return await this.Tag.findAll({
      limit: parseInt(limit, 10),
    });
  }

  async getProductsByTag(tagId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const tag = await this.Tag.findByPk(tagId, {
      include: [
        {
          model: Product, // Ensure this is the Sequelize model
          through: { attributes: [] }, // Skip join table attributes
        },
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    const total = await sequelize.models.Product_Tag.count({
      where: { tag_id: tagId },
    });

    return {
      products: tag.Products,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
  }

  async addToProduct(productId, tagId) {
    try {
      console.log(`Adding tag ${tagId} to product ${productId}`); // Debug log
      const [result, created] = await ProductTag.findOrCreate({
        where: { product_id: productId, tag_id: tagId },
      });
      console.log(`Tag added: ${created}`); // Debug log
      return created ? 1 : 0;
    } catch (error) {
      console.error('Error in addToProduct:', error.message); // Log the error
      throw error;
    }
  }

  async removeFromProduct(productId, tagId) {
    return await ProductTag.destroy({
      where: { product_id: productId, tag_id: tagId },
    });
  }

  async update(id, { name, slug }) {
    const [affectedRows] = await this.Tag.update({ name, slug }, { where: { id } });
    return affectedRows;
  }

  async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      await sequelize.models.Product_Tag.destroy({
        where: { tag_id: id },
        transaction,
      });

      const deletedRows = await this.Tag.destroy({
        where: { id },
        transaction,
      });

      await transaction.commit();
      return deletedRows;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = TagModel;
