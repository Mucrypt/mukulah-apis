// backend/models/entities/ProductTag.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const ProductTag = sequelize.define(
  'ProductTag',
  {
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    tag_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    tableName: 'product_tags',
    timestamps: false, // Disable Sequelize timestamps
    createdAt: false, // Explicitly disable createdAt
    updatedAt: false, // Explicitly disable updatedAt
    underscored: true,
    freezeTableName: true,
    indexes: [{ fields: ['product_id', 'tag_id'], unique: true }],
  }
);

module.exports = ProductTag;
