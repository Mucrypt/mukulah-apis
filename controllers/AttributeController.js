const Attribute = require('../models/AttributeModel');
const { pool } = require('../config/db');
const AppError = require('../utils/appError');

const attributeController = {
  // Create a new attribute
  createAttribute: async (req, res, next) => {
    try {
      const { name, slug, type, isFilterable, isVisible, isVariation } = req.body;

      const attribute = new Attribute(pool);
      const attributeId = await attribute.create({
        name,
        slug,
        type,
        isFilterable,
        isVisible,
        isVariation,
      });

      res.status(201).json({
        status: 'success',
        data: {
          attributeId,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get all attributes
  getAllAttributes: async (req, res, next) => {
    try {
      const { filterable, variation } = req.query;
      const attribute = new Attribute(pool);

      const attributes = await attribute.findAll({
        filterableOnly: filterable === 'true',
        variationOnly: variation === 'true',
      });

      res.status(200).json({
        status: 'success',
        results: attributes.length,
        data: {
          attributes,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get a single attribute
  getAttribute: async (req, res, next) => {
    try {
      const attribute = new Attribute(pool);
      const attributeData = await attribute.findById(req.params.id);

      if (!attributeData) {
        return next(new AppError('No attribute found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          attribute: attributeData,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Update an attribute
  updateAttribute: async (req, res, next) => {
    try {
      const attribute = new Attribute(pool);
      const updatedRows = await attribute.update(req.params.id, req.body);

      if (updatedRows === 0) {
        return next(new AppError('No attribute found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Attribute updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete an attribute
  deleteAttribute: async (req, res, next) => {
    try {
      const attribute = new Attribute(pool);
      const deletedRows = await attribute.delete(req.params.id);

      if (deletedRows === 0) {
        return next(new AppError('No attribute found with that ID', 404));
      }

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },

  // Get attribute values
  getAttributeValues: async (req, res, next) => {
    try {
      const attributeValue = new (require('../models/AttributeValueModel'))(pool);
      const values = await attributeValue.findByAttribute(req.params.id);

      res.status(200).json({
        status: 'success',
        results: values.length,
        data: {
          values,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Add attribute value
  addAttributeValue: async (req, res, next) => {
    try {
      const { value, slug, colorCode, imageUrl } = req.body;
      const attributeValue = new (require('../models/AttributeValueModel'))(pool);

      const valueId = await attributeValue.create({
        attributeId: req.params.id,
        value,
        slug,
        colorCode,
        imageUrl,
      });

      res.status(201).json({
        status: 'success',
        data: {
          valueId,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = attributeController;
