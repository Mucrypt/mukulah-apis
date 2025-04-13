// backend/models/entities/Seller.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Seller = sequelize.define(
  'Seller',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'seller',
    },
    business_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    business_slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/i,
      },
    },
    business_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    business_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    business_phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    business_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    business_logo: {
      type: DataTypes.STRING(512),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    business_banner: {
      type: DataTypes.STRING(512),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    tax_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    business_registration_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    website_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'suspended', 'rejected'),
      defaultValue: 'pending',
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.0,
      validate: {
        min: 0,
        max: 5,
      },
    },
    total_products: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    total_sales: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.0,
    },
    payment_method: {
      type: DataTypes.ENUM('bank_transfer', 'paypal', 'stripe'),
      allowNull: false,
    },
    payment_details: {
      type: DataTypes.JSON,
      allowNull: true,
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
    verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'sellers',
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        name: 'sellers_business_slug',
        unique: true,
        fields: ['business_slug'],
      },
      {
        name: 'sellers_business_email',
        unique: true,
        fields: ['business_email'],
      },
      {
        name: 'sellers_email',
        unique: true,
        fields: ['email'],
      },
    ],
  }
);

module.exports = Seller;
