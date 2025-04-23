//backend/models/entities/Category.js
const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

const Category = sequelize.define(
  'Category',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    },
    parent_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    lft: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    rgt: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    depth: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    product_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    meta_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    meta_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    meta_keywords: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    defaultScope: {
      order: [['display_order', 'ASC']],
    },
    scopes: {
      active: {
        where: {
          status: 'active',
        },
      },
      featured: {
        where: {
          is_featured: true,
        },
      },
      withSubcategories: {
        include: ['subcategories'],
      },
      topLevel: {
        where: {
          parent_id: null,
        },
      },
    },
  }
);

// Self-referential relationship for subcategories
Category.setupAssociations = function (models) {
  Category.hasMany(Category, {
    foreignKey: 'parent_id',
    as: 'subcategories',
    onDelete: 'SET NULL',
  });

  Category.belongsTo(Category, {
    foreignKey: 'parent_id',
    as: 'parent',
  });

  // Relationship with products
  Category.belongsToMany(models.Product, {
    through: 'product_categories',
    foreignKey: 'category_id',
    otherKey: 'product_id',
    as: 'products',
  });
};

// Instance methods
Category.prototype.getPath = async function () {
  const path = [];
  let current = this;

  while (current) {
    path.unshift(current);
    current = await current.getParent();
  }

  return path;
};

Category.prototype.getBreadcrumbs = async function () {
  const path = await this.getPath();
  return path.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
  }));
};

Category.prototype.getCategoryProducts = async function (filters = {}) {
  const { minPrice, maxPrice, rating, sortBy } = filters;

  const where = {};

  if (minPrice) where.price = { [Op.gte]: minPrice };
  if (maxPrice) where.price = { [Op.lte]: maxPrice };
  if (rating) where.average_rating = { [Op.gte]: rating };

  const order = [];
  if (sortBy === 'price_asc') order.push(['price', 'ASC']);
  if (sortBy === 'price_desc') order.push(['price', 'DESC']);
  if (sortBy === 'rating') order.push(['average_rating', 'DESC']);
  if (sortBy === 'newest') order.push(['created_at', 'DESC']);

  // Use the association to query products
  return await this.getProducts({
    where,
    order,
  });
};

Category.prototype.getTrendingProducts = async function (limit = 10) {
  return await this.getProducts({
    where: {
      views_count: { [Op.gt]: 0 }, // Example: Fetch products with views > 0
    },
    order: [['views_count', 'DESC']],
    limit,
  });
};

Category.prototype.setDisplayLayout = async function (layout) {
  this.display_layout = layout; // Assuming `display_layout` is a column in the `categories` table
  await this.save();
};
module.exports = Category;
