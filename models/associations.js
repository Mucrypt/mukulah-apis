const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

// Import entities
const Product = require('./entities/Product');
const Tag = require('./entities/Tag');
const ProductTag = require('./entities/ProductTag');
const ProductImage = require('./entities/ProductImage');
const ProductCategory = require('./entities/ProductCategory');
const ProductCollection = require('./entities/ProductCollection');
const ProductAttribute = require('./entities/ProductAttribute');
const ProductAttributeValue = require('./entities/ProductAttributeValue');
const Category = require('./entities/Category');
const Collection = require('./entities/Collection');
const Attribute = require('./entities/Attribute');
const AttributeValue = require('./entities/AttributeValue');
const ProductVariation = require('./entities/ProductVariation');
const ProductReview = require('./entities/ProductReview');
const Seller = require('./entities/Seller');
const VariationAttribute = require('./entities/VariationAttribute');
const Brand = require('./entities/Brand');
const User = require('./entities/User');
const Order = require('./entities/Order');
const Payout = require('./entities/Payout');
const SellerProduct = require('./entities/SellerProduct');

const defineAssociations = () => {
  // ===================== CATEGORY SELF-ASSOCIATIONS =====================
  Category.hasMany(Category, {
    foreignKey: 'parent_id',
    as: 'subcategories',
    onDelete: 'SET NULL',
  });

  Category.belongsTo(Category, {
    foreignKey: 'parent_id',
    as: 'parent',
  });

  Category.belongsToMany(Product, {
    through: 'product_categories', // Name of the join table
    foreignKey: 'category_id',
    otherKey: 'product_id',
    as: 'products',
  });

  // ===================== PRODUCT ↔ CATEGORY =====================
  Product.belongsToMany(Category, {
    through: 'product_categories',
    foreignKey: 'product_id',
    otherKey: 'category_id',
    as: 'categories',
    scope: {
      includeSubcategories: true,
    },
  });

  Product.belongsToMany(Category, {
    through: ProductCategory,
    foreignKey: 'product_id',
    as: 'categoriesWithSubcategories', // Unique alias
    scope: {
      includeSubcategories: true,
    },
  });

  // ===================== PRODUCT ↔ COLLECTION =====================
  Product.belongsToMany(Collection, {
    through: ProductCollection,
    foreignKey: 'product_id',
    as: 'collections',
  });

  Collection.belongsToMany(Product, {
    through: ProductCollection,
    foreignKey: 'collection_id',
    as: 'products',
  });

  // ===================== PRODUCT ↔ TAG =====================
  Product.belongsToMany(Tag, { through: ProductTag, foreignKey: 'product_id', as: 'tags' });
  Tag.belongsToMany(Product, { through: ProductTag, foreignKey: 'tag_id', as: 'products' });

  // ===================== PRODUCT ↔ ATTRIBUTE =====================
  Product.belongsToMany(Attribute, {
    through: ProductAttribute,
    foreignKey: 'product_id',
    otherKey: 'attribute_id',
    as: 'productAttributes',
  });

  Attribute.belongsToMany(Product, {
    through: ProductAttribute,
    foreignKey: 'attribute_id',
    otherKey: 'product_id',
    as: 'products',
  });

  // ===================== ATTRIBUTE → ATTRIBUTE VALUE =====================
  Attribute.hasMany(AttributeValue, { foreignKey: 'attribute_id', as: 'values' });
  AttributeValue.belongsTo(Attribute, { foreignKey: 'attribute_id', as: 'attribute' });

  // ===================== PRODUCT → IMAGE =====================
  Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'productImages' });
  ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  // ===================== SELLER → IMAGE =====================
  Seller.hasMany(ProductImage, { foreignKey: 'seller_id', as: 'sellerImages' });
  ProductImage.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });

  // ===================== PRODUCT → VARIATION =====================
  Product.hasMany(ProductVariation, { foreignKey: 'product_id', as: 'variations' });
  ProductVariation.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  // ===================== VARIATION → IMAGE =====================
  ProductVariation.belongsTo(ProductImage, {
    foreignKey: 'image_id',
    as: 'image',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  // ===================== PRODUCT ↔ REVIEW =====================
  Product.hasMany(ProductReview, { foreignKey: 'product_id', as: 'reviews' });
  ProductReview.belongsTo(Product, { foreignKey: 'product_id' });

  ProductReview.belongsTo(User, { foreignKey: 'customer_id', as: 'user' });
  User.hasMany(ProductReview, { foreignKey: 'customer_id', as: 'reviews' });

  // ===================== VARIATION ↔ ATTRIBUTE =====================
  ProductVariation.belongsToMany(Attribute, {
    through: { model: VariationAttribute, unique: false, attributes: [] },
    foreignKey: 'product_variation_id',
    otherKey: 'attribute_id',
    as: 'attributes',
  });

  Attribute.belongsToMany(ProductVariation, {
    through: { model: VariationAttribute, unique: false, attributes: [] },
    foreignKey: 'attribute_id',
    otherKey: 'product_variation_id',
    as: 'productVariations',
  });

  // ===================== VARIATION ↔ ATTRIBUTE VALUE =====================
  ProductVariation.belongsToMany(AttributeValue, {
    through: { model: VariationAttribute, unique: false, attributes: [] },
    foreignKey: 'product_variation_id',
    otherKey: 'attribute_value_id',
    as: 'attributeValues',
  });

  AttributeValue.belongsToMany(ProductVariation, {
    through: { model: VariationAttribute, unique: false, attributes: [] },
    foreignKey: 'attribute_value_id',
    otherKey: 'product_variation_id',
    as: 'productVariations',
  });

  // ===================== BRAND ↔ PRODUCT =====================
  Product.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });
  Brand.hasMany(Product, { foreignKey: 'brand_id', as: 'products' });

  // ===================== SELLER ↔ PRODUCT (via SellerProduct) =====================
  Seller.belongsToMany(Product, {
    through: SellerProduct,
    foreignKey: 'seller_id',
    otherKey: 'product_id',
    as: 'listedProducts',
  });

  Product.belongsToMany(Seller, {
    through: SellerProduct,
    foreignKey: 'product_id',
    otherKey: 'seller_id',
    as: 'linkedSellers',
  });

  // ===================== SELLER → PRODUCT (Direct FK) =====================
  Seller.hasMany(Product, { foreignKey: 'seller_id', as: 'products' });
  Product.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });

  // ===================== SELLER ↔ SELLER PRODUCT =====================
  Seller.hasMany(SellerProduct, { foreignKey: 'seller_id', as: 'sellerProducts' });
  Product.hasMany(SellerProduct, { foreignKey: 'product_id', as: 'sellerProducts' });
  SellerProduct.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });
  SellerProduct.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  // ===================== SELLER ↔ ORDER =====================
  Seller.hasMany(Order, { foreignKey: 'seller_id' });
  Order.belongsTo(Seller, { foreignKey: 'seller_id' });

  // ===================== SELLER ↔ PAYOUT =====================
  Seller.hasMany(Payout, { foreignKey: 'seller_id', as: 'payouts' });
  Payout.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });
};

module.exports = {
  defineAssociations,
  Product,
  Tag,
  ProductTag,
  Category,
  Collection,
  Attribute,
  AttributeValue,
  ProductImage,
  ProductCategory,
  ProductCollection,
  ProductAttribute,
  ProductAttributeValue,
  ProductReview,
  ProductVariation,
  Seller,
  SellerProduct,
  VariationAttribute,
  Brand,
};
