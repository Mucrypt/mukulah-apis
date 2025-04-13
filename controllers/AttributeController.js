const Attribute = require('../models/entities/Attribute');
const AttributeValue = require('../models/entities/AttributeValue');
const AppError = require('../utils/appError');
const { Sequelize } = require('sequelize');
 const slugify = require('slugify');

const attributesController = {
  // Create a new attribute
  createAttribute: async (req, res, next) => {
    try {
      const {
        name,
        slug,
        type,
        isFilterable = false,
        isVisible = true,
        isVariation = false,
      } = req.body;

      if (!name || !slug || !type) {
        return next(new AppError('Missing required fields: name, slug, or type', 400));
      }

      const attribute = await Attribute.create({
        name,
        slug,
        type,
        is_filterable: isFilterable,
        is_visible: isVisible,
        is_variation: isVariation,
      });

      res.status(201).json({ status: 'success', data: { attribute } });
    } catch (err) {
      if (err instanceof Sequelize.UniqueConstraintError) {
        return next(new AppError('Slug already exists. Please use a unique slug.', 400));
      }
      console.error('Create Attribute Error:', err);
      next(new AppError('Failed to create attribute', 500));
    }
  },

  // Get all attributes with their values
  getAllAttributes: async (req, res, next) => {
    try {
      const attributes = await Attribute.findAll({
        include: [{ model: AttributeValue, as: 'values' }],
        order: [['id', 'ASC']],
      });

      res.status(200).json({
        status: 'success',
        results: attributes.length,
        data: { attributes },
      });
    } catch (err) {
      console.error('Fetch Attributes Error:', err);
      next(new AppError('Failed to fetch attributes', 500));
    }
  },

  // Get single attribute by ID with values
  getAttributeById: async (req, res, next) => {
    try {
      const attribute = await Attribute.findByPk(req.params.id, {
        include: [{ model: AttributeValue, as: 'values' }],
      });

      if (!attribute) return next(new AppError('Attribute not found', 404));

      res.status(200).json({ status: 'success', data: { attribute } });
    } catch (err) {
      console.error('Get Attribute Error:', err);
      next(new AppError('Failed to fetch attribute', 500));
    }
  },

  // Get attribute values only
  getAttributeValues: async (req, res) => {
    try {
      const attributeId = req.params.id;
      const values = await AttributeValue.findAll({
        where: { attribute_id: attributeId },
        order: [['position', 'ASC']],
      });

      res.status(200).json({
        status: 'success',
        results: values.length,
        data: { values },
      });
    } catch (error) {
      console.error('Error fetching attribute values:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch attribute values',
      });
    }
  },

  // Update an attribute
  updateAttribute: async (req, res, next) => {
    try {
      const attribute = await Attribute.findByPk(req.params.id);
      if (!attribute) {
        return next(new AppError('Attribute not found', 404));
      }

      const updated = await attribute.update({
        name: req.body.name ?? attribute.name,
        slug: req.body.slug ?? attribute.slug,
        type: req.body.type ?? attribute.type,
        is_filterable: req.body.isFilterable ?? attribute.is_filterable,
        is_visible: req.body.isVisible ?? attribute.is_visible,
        is_variation: req.body.isVariation ?? attribute.is_variation,
      });

      res.status(200).json({
        status: 'success',
        message: `Attribute "${updated.name}" has been updated successfully.`,
        data: { attribute: updated },
      });
    } catch (err) {
      console.error('Update Attribute Error:', err);
      next(new AppError('Failed to update attribute', 500));
    }
  },

  // Delete an attribute and its values
  deleteAttribute: async (req, res, next) => {
    try {
      const attribute = await Attribute.findByPk(req.params.id);
      if (!attribute) {
        return next(new AppError('Attribute not found', 404));
      }

      // Delete all values associated with the attribute
      await AttributeValue.destroy({ where: { attribute_id: attribute.id } });

      // Delete the attribute itself
      await attribute.destroy();

      res.status(200).json({
        status: 'success',
        message: `Attribute "${attribute.name}" and its values have been successfully deleted.`,
      });
    } catch (err) {
      console.error('Delete Attribute Error:', err);
      next(new AppError('Failed to delete attribute', 500));
    }
  },
  // Create value under attribute

  createAttributeValue: async (req, res, next) => {
    try {
      const { values } = req.body;
      const attributeId = req.params.attributeId;

      const attribute = await Attribute.findByPk(attributeId);
      if (!attribute) return next(new AppError('Attribute not found', 404));

      const formattedValues = (Array.isArray(values) ? values : [values]).map((v) => ({
        attribute_id: attributeId,
        value: v.value,
        slug: slugify(v.value, { lower: true }),
        color_code: v.colorCode || null,
        image_url: v.imageUrl || null,
        position: v.position || 0,
      }));

      const createdValues = await AttributeValue.bulkCreate(formattedValues);
      res.status(201).json({ status: 'success', data: { values: createdValues } });
    } catch (err) {
      console.error('Create Attribute Value Error:', err);
      next(new AppError('Failed to create attribute value', 500));
    }
  },

  // Update attribute value
  updateAttributeValue: async (req, res, next) => {
    try {
      const valueId = req.params.valueId;
      const attributeValue = await AttributeValue.findByPk(valueId);
      if (!attributeValue) return next(new AppError('Attribute value not found', 404));

      await attributeValue.update({
        value: req.body.value ?? attributeValue.value,
        slug: req.body.slug ?? attributeValue.slug,
        color_code: req.body.colorCode ?? attributeValue.color_code,
        image_url: req.body.imageUrl ?? attributeValue.image_url,
        position: req.body.position ?? attributeValue.position,
      });

      res.status(200).json({ status: 'success', data: { value: attributeValue } });
    } catch (err) {
      console.error('Update Attribute Value Error:', err);
      next(new AppError('Failed to update attribute value', 500));
    }
  },

  // Delete attribute value
  deleteAttributeValue: async (req, res, next) => {
    try {
      const attributeValue = await AttributeValue.findByPk(req.params.valueId);
      if (!attributeValue) return next(new AppError('Attribute value not found', 404));

      await attributeValue.destroy();
      res.status(204).json({ status: 'success', data: null });
    } catch (err) {
      console.error('Delete Attribute Value Error:', err);
      next(new AppError('Failed to delete attribute value', 500));
    }
  },
  // Upload attribute value image
  uploadAttributeValueImage: async (req, res, next) => {
    try {
      const filePath = `/uploads/${req.file.filename}`;
      res.status(200).json({ status: 'success', data: { imageUrl: filePath } });
    } catch (err) {
      next(new AppError('Image upload failed', 500));
    }
  },
};

module.exports = attributesController;
