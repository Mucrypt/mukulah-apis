const AppError = require('../utils/appError');
const TagModel = require('../models/TagModel');

const tagController = {
  // Create tag
  createTag: async (req, res, next) => {
    try {
      const { name, slug } = req.body;
      const tag = new TagModel();

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
      const tag = new TagModel();

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
      const tag = new TagModel();
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
      const tag = new TagModel();

      let tagId;
      if (!isNaN(req.params.id)) {
        tagId = parseInt(req.params.id, 10);
      } else {
        const tagData = await tag.findBySlug(req.params.id);
        if (!tagData) {
          return next(new AppError('No tag found with that slug', 404));
        }
        tagId = tagData.id;
      }

      // Validate and sanitize parameters
      const validatedPage = Math.max(1, parseInt(page, 10) || 1);
      const validatedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const products = await tag.getProductsByTag(tagId, {
        page: validatedPage,
        limit: validatedLimit,
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
      const tag = new TagModel();
      const addedRows = await tag.addToProduct(
        parseInt(req.params.productId, 10),
        parseInt(req.params.tagId, 10)
      );

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
      const tag = new TagModel();
      const removedRows = await tag.removeFromProduct(
        parseInt(req.params.productId, 10),
        parseInt(req.params.tagId, 10)
      );

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
      const tag = new TagModel();
      const updatedRows = await tag.update(parseInt(req.params.id, 10), { name, slug });

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
      const tag = new TagModel();
      const deletedRows = await tag.delete(parseInt(req.params.id, 10));

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
