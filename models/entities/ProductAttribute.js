const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const ProductAttribute = sequelize.define(
  'ProductAttribute',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    attribute_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    tableName: 'product_attributes',
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    underscored: true,
    freezeTableName: true,
    indexes: [{ fields: ['product_id', 'attribute_id'], unique: true }],
  }
);

module.exports = ProductAttribute;
