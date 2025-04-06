// backend/models/entities/Tag.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Tag = sequelize.define(
  'Tag',
  {
    id: {
      type: DataTypes.INTEGER,
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'tags',
    timestamps: true,
    indexes: [{ fields: ['slug'] }],
  }
);

module.exports = Tag;
