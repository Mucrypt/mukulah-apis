const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const ProductAttributeValue = sequelize.define(
  'ProductAttributeValue',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    product_attribute_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    attribute_value_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
  },
  {
    tableName: 'product_attribute_values',
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        fields: ['product_attribute_id', 'attribute_value_id'],
        unique: true,
      },
    ],
  }
);

module.exports = ProductAttributeValue;
