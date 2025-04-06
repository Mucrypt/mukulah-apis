const { DataTypes } = require('sequelize');
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
      validate: {
        is: /^[a-z0-9-]+$/i, // slug format
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

module.exports = Attribute;
