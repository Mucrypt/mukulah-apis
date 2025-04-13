// models/entities/Checkout.js (Sequelize model)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('./User');
const Seller = require('./Seller');

const Checkout = sequelize.define(
  'Checkout',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    shipping_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    shipping_city: DataTypes.STRING,
    shipping_postal_code: DataTypes.STRING,
    shipping_country: DataTypes.STRING,
    payment_method: DataTypes.STRING,
    total_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    is_paid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    paid_at: DataTypes.DATE,
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      defaultValue: 'pending',
    },
    payment_details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_finalized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    finalized_at: DataTypes.DATE,
    order_status: {
      type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
      defaultValue: 'pending',
    },
  },
  {
    tableName: 'checkout',
    timestamps: true,
    underscored: true,
  }
);

Checkout.associate = () => {
  Checkout.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Checkout.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });
};

module.exports = Checkout;
