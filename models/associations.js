// backend/models/associations.js
const { sequelize } = require('../config/db');
const Product = require('./entities/Product');
const Tag = require('./entities/Tag');
const ProductTag = require('./entities/ProductTag');
const ProductImage = require('./entities/ProductImage'); // Ensure ProductImage is imported
const ProductCategory = require('./entities/ProductCategory'); // Ensure ProductCategory is imported
const ProductCollection = require('./entities/ProductCollection'); // Ensure ProductCollection is imported
const ProductAttribute = require('./entities/ProductAttribute'); // Ensure ProductAttribute is imported
const Category = require('./entities/Category'); // Import Category
const Collection = require('./entities/Collection'); // Import Collection
const Attribute = require('./entities/Attribute'); // Import Attribute
const ProductVariation = require('./entities/ProductVariation'); // Import ProductVariation
const ProductReview = require('./entities/ProductReview'); // Import ProductReview
const AttributeValue = require('./entities/AttributeValue'); // Import AttributeValue
const Seller = require('./entities/Seller'); // ✅ Import Seller

Product.belongsToMany(Category, { through: ProductCategory, foreignKey: 'product_id' });
Category.belongsToMany(Product, { through: ProductCategory, foreignKey: 'category_id' });
Product.belongsToMany(Collection, { through: ProductCollection, foreignKey: 'product_id' });
Collection.belongsToMany(Product, { through: ProductCollection, foreignKey: 'collection_id' });
Product.belongsToMany(Attribute, {
  through: ProductAttribute,
  foreignKey: 'product_id',
  as: 'productAttributes',
});
Attribute.belongsToMany(Product, {
  through: ProductAttribute,
  foreignKey: 'attribute_id',
  as: 'products',
});
Product.hasMany(ProductImage, { foreignKey: 'product_id' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(ProductVariation, { foreignKey: 'product_id' });
Product.hasMany(ProductReview, { foreignKey: 'product_id' });
ProductReview.belongsTo(Product, { foreignKey: 'product_id' });

// Define associations
Product.belongsToMany(Tag, {
  through: ProductTag,
  foreignKey: 'product_id',
  otherKey: 'tag_id',
});

Tag.belongsToMany(Product, {
  through: ProductTag,
  foreignKey: 'tag_id',
  otherKey: 'product_id',
});

// Define associations for ProductVariation
ProductVariation.belongsToMany(Attribute, {
  through: 'variation_attributes',
  foreignKey: 'product_variation_id',
  otherKey: 'attribute_id',
  as: 'variationAttributesForProductVariation', // Updated alias to avoid conflict
});

Attribute.belongsToMany(ProductVariation, {
  through: 'variation_attributes',
  foreignKey: 'attribute_id',
  otherKey: 'product_variation_id',
  as: 'productVariations', // Updated alias to avoid conflict
});

// ProductVariation ➝ ProductImage association
ProductVariation.belongsTo(ProductImage, {
  foreignKey: 'image_id',
  targetKey: 'id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

const defineAssociations = () => {
  // Product ⬌ Category
  Product.belongsToMany(Category, { through: ProductCategory, foreignKey: 'product_id' });
  Category.belongsToMany(Product, { through: ProductCategory, foreignKey: 'category_id' });

  // Product ⬌ Collection
  Product.belongsToMany(Collection, { through: ProductCollection, foreignKey: 'product_id' });
  Collection.belongsToMany(Product, { through: ProductCollection, foreignKey: 'collection_id' });

  // Product ⬌ Attribute
  Product.belongsToMany(Attribute, {
    through: ProductAttribute,
    foreignKey: 'product_id',
    as: 'productAttributes',
  });
  Attribute.belongsToMany(Product, {
    through: ProductAttribute,
    foreignKey: 'attribute_id',
    as: 'products',
  });

  // Product ➝ ProductImage
  Product.hasMany(ProductImage, { foreignKey: 'product_id' });
  ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

  // Product ➝ ProductVariation ➝ ProductImage
  Product.hasMany(ProductVariation, { foreignKey: 'product_id' });
  ProductVariation.belongsTo(Product, { foreignKey: 'product_id' });
  ProductVariation.belongsTo(ProductImage, {
    foreignKey: 'image_id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  // Product ➝ ProductReview
  Product.hasMany(ProductReview, { foreignKey: 'product_id' });
  ProductReview.belongsTo(Product, { foreignKey: 'product_id' });

  // Product ⬌ Tag
  Product.belongsToMany(Tag, { through: ProductTag, foreignKey: 'product_id' });
  Tag.belongsToMany(Product, { through: ProductTag, foreignKey: 'tag_id' });

  // ProductVariation ⬌ Attribute
  ProductVariation.belongsToMany(Attribute, {
    through: 'variation_attributes',
    foreignKey: 'product_variation_id',
    otherKey: 'attribute_id',
    as: 'variationAttributesForProductVariation',
  });
  Attribute.belongsToMany(ProductVariation, {
    through: 'variation_attributes',
    foreignKey: 'attribute_id',
    otherKey: 'product_variation_id',
    as: 'productVariations',
  });

 
};

// ✅ Seller ➔ Product association
Seller.hasMany(Product, { foreignKey: 'seller_id' });
Product.belongsTo(Seller, { foreignKey: 'seller_id' });


module.exports = {
  Product,
  Tag,
  ProductTag,
  Category, // Export Category
  Collection, // Export Collection
  Attribute, // Export Attribute
  ProductImage,
  ProductCategory,
  ProductCollection,
  ProductAttribute,
  ProductReview, // Export ProductReview
  ProductVariation, // Export ProductVariation
  AttributeValue, // Export AttributeValue
  Seller, // Export Seller
  
};
