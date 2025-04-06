const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const ProductCategory = sequelize.define(
  'ProductCategory',
  {
    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'products',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    category_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'categories',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indicates if this is the primary category for the product',
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Sorting position within category',
    },
  },
  {
    tableName: 'product_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        fields: ['product_id', 'category_id'],
        unique: true,
      },
      {
        fields: ['category_id'],
        name: 'idx_category_id',
      },
      {
        fields: ['is_primary'],
        name: 'idx_is_primary',
      },
    ],
    hooks: {
      afterCreate: async (productCategory, options) => {
        // Ensure only one primary category per product
        if (productCategory.is_primary) {
          await ProductCategory.update(
            { is_primary: false },
            {
              where: {
                product_id: productCategory.product_id,
                category_id: { [sequelize.Op.ne]: productCategory.category_id },
              },
              transaction: options.transaction,
            }
          );
        }
      },
    },
  }
);

// Class methods
ProductCategory.findPrimaryForProduct = async function (productId) {
  return this.findOne({
    where: {
      product_id: productId,
      is_primary: true,
    },
  });
};

// Instance methods
ProductCategory.prototype.setAsPrimary = async function () {
  await this.sequelize.transaction(async (transaction) => {
    await ProductCategory.update(
      { is_primary: false },
      {
        where: { product_id: this.product_id },
        transaction,
      }
    );
    this.is_primary = true;
    await this.save({ transaction });
  });
  return this;
};

module.exports = ProductCategory;
