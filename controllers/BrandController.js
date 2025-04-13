const Brand = require('../models/entities/Brand');
const Product = require('../models/entities/Product');
const AppError = require('../utils/appError');

const brandController = {
  // Create a new brand
  createBrand: async (req, res, next) => {
    try {
      const { name, slug, description, logoUrl, websiteUrl, is_featured, status } = req.body;

      const brand = await Brand.create({
        name,
        slug,
        description,
        logo_url: logoUrl,
        website_url: websiteUrl,
        is_featured,
        status,
      });

      res.status(201).json({
        status: 'success',
        data: { brand },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get all brands
  getAllBrands: async (req, res, next) => {
    try {
      const { featured } = req.query;

      const where = {};
      if (featured === 'true') {
        where.is_featured = true;
      }

      const brands = await Brand.findAll({ where });

      res.status(200).json({
        status: 'success',
        results: brands.length,
        data: { brands },
      });
    } catch (err) {
      next(err);
    }
  },

  // Get a single brand
  getBrand: async (req, res, next) => {
    try {
      const includeProducts = req.query.withProducts === 'true';

      const brand = await Brand.findByPk(req.params.id, {
        include: includeProducts ? [{ model: Product, as: 'products' }] : [],
      });

      if (!brand) return next(new AppError('No brand found with that ID', 404));

      res.status(200).json({
        status: 'success',
        data: { brand },
      });
    } catch (err) {
      next(err);
    }
  },

  // Update a brand
  updateBrand: async (req, res, next) => {
    try {
      const brand = await Brand.findByPk(req.params.id);
      if (!brand) return next(new AppError('No brand found with that ID', 404));

      await brand.update({
        name: req.body.name ?? brand.name,
        slug: req.body.slug ?? brand.slug,
        description: req.body.description ?? brand.description,
        logo_url: req.body.logoUrl ?? brand.logo_url,
        website_url: req.body.websiteUrl ?? brand.website_url,
        is_featured: req.body.is_featured ?? brand.is_featured,
        status: req.body.status ?? brand.status,
      });

      res.status(200).json({
        status: 'success',
        message: 'Brand updated successfully',
        data: { brand },
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete a brand
  deleteBrand: async (req, res, next) => {
    try {
      const brand = await Brand.findByPk(req.params.id);
      if (!brand) return next(new AppError('No brand found with that ID', 404));

      await brand.destroy();

      res.status(204).json({ status: 'success', data: null });
    } catch (err) {
      next(err);
    }
  },

  // Get brand products
  getBrandProducts: async (req, res, next) => {
    try {
      const brand = await Brand.findByPk(req.params.id, {
        include: [{ model: Product, as: 'products' }],
      });

      if (!brand) return next(new AppError('Brand not found', 404));

      res.status(200).json({
        status: 'success',
        results: brand.products.length,
        data: { products: brand.products },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = brandController;
