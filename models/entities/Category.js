const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Category = sequelize.define(
  'Category',
  {
   id: {
  type: DataTypes.BIGINT.UNSIGNED,
  autoIncrement: true,
  primaryKey: true
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
    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    parent_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },

    lft: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rgt: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    depth: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
    },
  },
  {
    tableName: 'categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  }
);

module.exports = Category;
