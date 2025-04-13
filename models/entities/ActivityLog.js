// models/entities/ActivityLog.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const ActivityLog = sequelize.define(
  'ActivityLog',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    seller_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'activity_logs',
    timestamps: true,
    underscored: true,
  }
);

module.exports = ActivityLog;
