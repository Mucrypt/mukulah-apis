const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const ProductImage = sequelize.define(
  'ProductImage',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    seller_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'sellers',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    url: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isUrl: true,
      },
    },
    alt_text: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'product_images',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['product_id'] },
      { fields: ['position'] },
      { fields: ['is_primary'] },
      { fields: ['seller_id'] },
    ],
  }
);

// Scopes
ProductImage.addScope('adminImages', {
  where: { seller_id: null },
});

ProductImage.addScope('sellerImages', (sellerId) => ({
  where: { seller_id: sellerId },
}));

ProductImage.addScope('productImages', (productId) => ({
  where: { product_id: productId },
}));

ProductImage.addScope('primaryImage', {
  where: { is_primary: true },
});

module.exports = ProductImage;
