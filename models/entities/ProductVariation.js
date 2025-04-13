const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const Attribute = require('./Attribute'); // Import Attribute model

const ProductVariation = sequelize.define(
  'ProductVariation',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'Product ID is required' },
        isInt: { msg: 'Product ID must be an integer' },
      },
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notNull: { msg: 'SKU is required' },
        len: { args: [1, 255], msg: 'SKU must be between 1 and 255 characters' },
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'Price is required' },
        isDecimal: { msg: 'Price must be a decimal value' },
      },
    },
    discount_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        isDecimal: { msg: 'Discount price must be a decimal value' },
      },
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isInt: { msg: 'Stock quantity must be an integer' },
      },
    },
    stock_status: {
      type: DataTypes.STRING,
      defaultValue: 'in_stock',
      validate: {
        isIn: {
          args: [['in_stock', 'out_of_stock', 'pre_order']],
          msg: 'Stock status must be one of: in_stock, out_of_stock, pre_order',
        },
      },
    },
    image_id: {
      type: DataTypes.BIGINT.UNSIGNED, // 🔥 This matches product_images.id now
      allowNull: true,
      validate: {
        isInt: { msg: 'Image ID must be an integer' },
      },
    },

    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'product_variations',
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    indexes: [{ fields: ['product_id', 'sku'], unique: true }],
  }
);





module.exports = ProductVariation;
