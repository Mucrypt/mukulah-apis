// backend/models/entities/Product.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Product = sequelize.define(
  'Product',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    short_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discount_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    cost_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    upc: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ean: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isbn: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    brand_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    stock_status: {
      type: DataTypes.STRING,
      defaultValue: 'in_stock',
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    length: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    width: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    height: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    min_order_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'draft',
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_bestseller: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_new: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    needs_shipping: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    tax_class: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    meta_title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    meta_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    meta_keywords: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    views_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    sales_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    wishlist_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    rating_total: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    rating_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
    },
  },
  {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  }
);

module.exports = Product;
