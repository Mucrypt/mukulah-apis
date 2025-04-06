//backend/models/entities/ProductImage.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const ProductImage = sequelize.define(
  'ProductImage',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED, // 👈 Must match MySQL
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    alt_text: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'product_images',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  }
);

module.exports = ProductImage;
