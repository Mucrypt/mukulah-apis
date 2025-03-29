const Category = require('../models/CategoryModel');
const { pool } = require('../config/db');
const AppError = require('../utils/appError');

const categoryController = {
  // Create a new category
  createCategory: async (req, res, next) => {
    try {
      const { name, slug, description, imageUrl, parentId } = req.body;

      const category = new Category(pool);
      const categoryId = await category.create({
        name,
        slug,
        description,
        imageUrl,
        parentId,
      });

      res.status(201).json({
        status: 'success',
        data: {
          categoryId,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get full category tree
  getCategoryTree: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const tree = await category.getFullTree();

      res.status(200).json({
        status: 'success',
        results: tree.length,
        data: {
          categories: tree,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get a single category
  getCategory: async (req, res, next) => {
    try {
      const { withChildren, withProducts } = req.query;
      const category = new Category(pool);
      const categoryData = await category.findById(
        req.params.id,
        withChildren === 'true',
        withProducts === 'true'
      );

      if (!categoryData) {
        return next(new AppError('No category found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          category: categoryData,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Update a category
  updateCategory: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const updatedRows = await category.update(req.params.id, req.body);

      if (updatedRows === 0) {
        return next(new AppError('No category found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Category updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete a category
  deleteCategory: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const success = await category.delete(req.params.id);

      if (!success) {
        return next(new AppError('No category found with that ID', 404));
      }

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },

  // Get category products
  getCategoryProducts: async (req, res, next) => {
    try {
      const category = new Category(pool);
      const products = await category.getCategoryProducts(req.params.id);

      res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = categoryController;
