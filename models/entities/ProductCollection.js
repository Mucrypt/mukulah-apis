const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const ProductCollection = sequelize.define(
  'ProductCollection',
  {
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    collection_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    tableName: 'product_collections',
    timestamps: false, // Disable Sequelize timestamps
    createdAt: false, // Explicitly disable createdAt
    updatedAt: false, // Explicitly disable updatedAt
    underscored: true,
    freezeTableName: true,
    indexes: [{ fields: ['product_id', 'collection_id'], unique: true }],
  }
);

module.exports = ProductCollection;
