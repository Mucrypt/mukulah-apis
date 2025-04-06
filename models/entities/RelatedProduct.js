const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const RelatedProduct = sequelize.define(
  'RelatedProduct',
  {
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    related_product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'related_products',
    timestamps: false, // Disable Sequelize timestamps
    createdAt: false, // Explicitly disable createdAt
    updatedAt: false, // Explicitly disable updatedAt
    underscored: true,
    freezeTableName: true,
    indexes: [{ fields: ['product_id', 'related_product_id'], unique: true }],
  }
);

module.exports = RelatedProduct;
