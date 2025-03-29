const Brand = require('../models/BrandModel');
const { pool } = require('../config/db');
const AppError = require('../utils/appError');

const brandController = {
  // Create a new brand
  createBrand: async (req, res, next) => {
    try {
      const { name, slug, description, logoUrl, websiteUrl } = req.body;

      const brand = new Brand(pool);
      const brandId = await brand.create({
        name,
        slug,
        description,
        logoUrl,
        websiteUrl,
      });

      res.status(201).json({
        status: 'success',
        data: {
          brandId,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get all brands
  getAllBrands: async (req, res, next) => {
    try {
      const { featured } = req.query;
      const brand = new Brand(pool);

      const brands = await brand.findAll({
        featuredOnly: featured === 'true',
      });

      res.status(200).json({
        status: 'success',
        results: brands.length,
        data: {
          brands,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get a single brand
  getBrand: async (req, res, next) => {
    try {
      const { withProducts } = req.query;
      const brand = new Brand(pool);
      const brandData = await brand.findById(req.params.id, withProducts === 'true');

      if (!brandData) {
        return next(new AppError('No brand found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          brand: brandData,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Update a brand
  updateBrand: async (req, res, next) => {
    try {
      const brand = new Brand(pool);
      const updatedRows = await brand.update(req.params.id, req.body);

      if (updatedRows === 0) {
        return next(new AppError('No brand found with that ID', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Brand updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete a brand
  deleteBrand: async (req, res, next) => {
    try {
      const brand = new Brand(pool);
      const deletedRows = await brand.delete(req.params.id);

      if (deletedRows === 0) {
        return next(new AppError('No brand found with that ID', 404));
      }

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },

  // Get brand products
  getBrandProducts: async (req, res, next) => {
    try {
      const brand = new Brand(pool);
      const products = await brand.getBrandProducts(req.params.id);

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

module.exports = brandController;
