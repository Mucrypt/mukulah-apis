const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const CrossSellProduct = sequelize.define(
  'CrossSellProduct',
  {
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    cross_sell_product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'cross_sell_products',
    timestamps: false, // Disable Sequelize timestamps
    createdAt: false, // Explicitly disable createdAt
    updatedAt: false, // Explicitly disable updatedAt
    underscored: true,
    freezeTableName: true,
    indexes: [{ fields: ['product_id', 'cross_sell_product_id'], unique: true }],
  }
);

module.exports = CrossSellProduct;
