const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Payout = sequelize.define(
  'Payout',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    seller_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    arrival_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    stripe_payout_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    approval_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    approved_by: {
      type: DataTypes.INTEGER, // Admin user ID
      allowNull: true,
    },
    approval_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    approval_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'payouts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  }
);

module.exports = Payout;
