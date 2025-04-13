// /models/entities/Attribute.js
const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

const Attribute = sequelize.define(
  'Attribute',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/i,
      },
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    is_filterable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_visible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_variation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    position: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
  },
  {
    tableName: 'attributes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        name: 'unique_attribute_slug',
        unique: true,
        fields: ['slug'],
      },
    ],
  }
);

// 🔁 Custom static methods to replicate old functionality
Attribute.findCustomById = async (id) => {
  return await Attribute.findByPk(id);
};

Attribute.findCustomAll = async ({ filterableOnly = false, variationOnly = false } = {}) => {
  const where = {};

  if (filterableOnly) where.is_filterable = true;
  if (variationOnly) where.is_variation = true;

  return await Attribute.findAll({
    where,
    order: [['position', 'ASC']],
  });
};

Attribute.updateCustom = async (id, updates) => {
  const [affectedRows] = await Attribute.update(updates, { where: { id } });
  return affectedRows;
};

Attribute.deleteCustom = async (id) => {
  const deleted = await Attribute.destroy({ where: { id } });
  return deleted;
};

module.exports = Attribute;
