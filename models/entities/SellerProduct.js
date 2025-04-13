const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/db').sequelize; // ✅ make sure you're importing the actual Sequelize instance

class SellerProduct extends Model {}

SellerProduct.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    stock_status: {
      type: DataTypes.STRING,
      defaultValue: 'in_stock',
    },
    condition: {
      type: DataTypes.STRING,
      defaultValue: 'new',
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    views_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    clicks_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    conversion_rate: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    last_purchased_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize, // ✅ This is the key fix!
    modelName: 'SellerProduct',
    tableName: 'seller_products',
    underscored: true,
    timestamps: true,
  }
);

module.exports = SellerProduct;
