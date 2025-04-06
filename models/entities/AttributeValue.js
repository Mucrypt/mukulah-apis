//backend/models/entities/AttributeValue.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const AttributeValue = sequelize.define(
  'AttributeValue',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED, // ✅ Match MySQL schema
      autoIncrement: true,
      primaryKey: true,
    },
    attribute_id: {
      type: DataTypes.BIGINT.UNSIGNED, // ✅ Must match Attribute.id
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    color_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'attribute_values',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  }
);

module.exports = AttributeValue;
