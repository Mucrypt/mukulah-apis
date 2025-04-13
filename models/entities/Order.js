// backend/models/entities/Order.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Nullable for multi-seller or admin orders
    },
    shipping_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    shipping_city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    shipping_postal_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    shipping_country: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    total_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    is_paid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_delivered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      defaultValue: 'pending',
    },
    status: {
      type: DataTypes.ENUM('processing', 'shipped', 'delivered', 'cancelled'),
      defaultValue: 'processing',
    },
    cancelled_by: {
      type: DataTypes.ENUM('seller', 'buyer'),
      allowNull: true,
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'orders',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['seller_id'] }, // ✅ new index
      { fields: ['status'] },
      { fields: ['payment_status'] },
      { fields: ['created_at'] },
    ],
  }
);

module.exports = Order;
