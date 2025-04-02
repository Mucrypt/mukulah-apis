const { date } = require('zod');
const { pool } = require('../config/db');
const AppError = require('../utils/appError');

const tagController = {
  // Create tag
  createTag: async (req, res, next) => {
    try {
      const { name, slug } = req.body;
      const tag = new (require('../models/TagModel'))(pool);

      const tagId = await tag.create({
        name,
        slug,
      });

      res.status(201).json({
        status: 'success',
        data: {
          tagId,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get all tags
  getAllTags: async (req, res, next) => {
    try {
      const { popular, limit } = req.query;
      const tag = new (require('../models/TagModel'))(pool);

      const tags = await tag.findAll({
        popularOnly: popular === 'true',
        limit: limit || 50,
      });

      res.status(200).json({
        status: 'success',
        results: tags.length,
        data: {
          tags,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get tag by ID or slug
  getTag: async (req, res, next) => {
    try {
      const tag = new (require('../models/TagModel'))(pool);
      let tagData;

      // Check if param is ID (number) or slug (string)
      if (!isNaN(req.params.id)) {
        tagData = await tag.findById(req.params.id);
      } else {
        tagData = await tag.findBySlug(req.params.id);
      }

      if (!tagData) {
        return next(new AppError('No tag found with that ID/slug', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          tag: tagData,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get products by tag
  getTagProducts: async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const tag = new (require('../models/TagModel'))(pool);

      let tagId;
      // Check if param is ID (number) or slug (string)
      if (!isNaN(req.params.id)) {
        tagId = req.params.id;
      } else {
        const tagData = await tag.findBySlug(req.params.id);
        if (!tagData) {
          return next(new AppError('No tag found with that slug', 404));
        }
        tagId = tagData.id;
      }

      const products = await tag.getProductsByTag(tagId, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.status(200).json({
        status: 'success',
        results: products.products.length,
        total: products.total,
        page: products.page,
        pages: Math.ceil(products.total / products.limit),
        data: {
          products: products.products,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Add tag to product
  addTagToProduct: async (req, res, next) => {
    try {
      const tag = new (require('../models/TagModel'))(pool);
      const addedRows = await tag.addToProduct(req.params.productId, req.params.tagId);

      if (addedRows === 0) {
        return next(new AppError('Tag already exists on product', 400));
      }

      res.status(200).json({
        status: 'success',
        message: 'Tag added to product',
      });
    } catch (err) {
      next(err);
    }
  },

  // Remove tag from product
  removeTagFromProduct: async (req, res, next) => {
    try {
      const tag = new (require('../models/TagModel'))(pool);
      const removedRows = await tag.removeFromProduct(req.params.productId, req.params.tagId);

      if (removedRows === 0) {
        return next(new AppError('Tag not found on product', 404));
      }

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },

  // Update tag
  updateTag: async (req, res, next) => {
    try {
      const { name, slug } = req.body;
      const tag = new (require('../models/TagModel'))(pool);
      const updatedRows = await tag.update(req.params.id, { name, slug });

      if (updatedRows === 0) {
        return next(new AppError('No tag found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Tag updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete tag
  deleteTag: async (req, res, next) => {
    try {
      const tag = new (require('../models/TagModel'))(pool);
      const deletedRows = await tag.delete(req.params.id);

      if (deletedRows === 0) {
        return next(new AppError('No tag found with that ID', 404));
      }

      res.status(204).json({
        status: 'success',
        message: 'Tag deleted successfully',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = tagController;
