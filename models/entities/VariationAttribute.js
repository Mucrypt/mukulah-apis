const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const VariationAttribute = sequelize.define(
  'VariationAttribute',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    product_variation_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    attribute_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    attribute_value_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
  },
  {
    tableName: 'variation_attributes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        fields: ['product_variation_id', 'attribute_id', 'attribute_value_id'],
        unique: true,
      },
    ],
  }
);

module.exports = VariationAttribute;
