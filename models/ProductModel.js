// backend/models/ProductModel.js
const { sequelize } = require('../config/db');
const Product = require('./entities/Product');
const ProductImage = require('./entities/ProductImage'); // Import ProductImage
const ProductCategory = require('./entities/ProductCategory'); // Import ProductCategory
const ProductCollection = require('./entities/ProductCollection'); // Import ProductCollection
const ProductAttribute = require('./entities/ProductAttribute'); // Import ProductAttribute
const ProductAttributeValue = require('./entities/ProductAttributeValue'); // Import ProductAttributeValue
const ProductVariation = require('./entities/ProductVariation'); // Import ProductVariation
const VariationAttribute = require('./entities/VariationAttribute'); // Import VariationAttribute
const ProductReview = require('./entities/ProductReview'); // Import ProductReview
const ProductTag = require('./entities/ProductTag');
const RelatedProduct = require('./entities/RelatedProduct'); // Import RelatedProduct
const CrossSellProduct = require('./entities/CrossSellProduct'); // Import CrossSellProduct
const UpSellProduct = require('./entities/UpSellProduct'); // Import UpSellProduct
const Category = require('./entities/Category'); // Import Category
const Collection = require('./entities/Collection'); // Import Collection
const Attribute = require('./entities/Attribute'); // Import Attribute
const AttributeValue = require('./entities/AttributeValue'); // Import AttributeValue
const Brand = require('./entities/Brand'); // Import Brand




class ProductModel {
  constructor() {
    this.Product = Product;
  }

  async create(productData) {
    const transaction = await sequelize.transaction();
    try {
      // Validate required fields
      if (!productData.name) throw new Error('Product name is required');
      if (!productData.price || isNaN(productData.price))
        throw new Error('Valid price is required');
      if (!productData.sku) throw new Error('SKU is required');

      // Validate stock status
      const validStockStatuses = ['in_stock', 'out_of_stock', 'pre_order'];
      if (productData.stockStatus && !validStockStatuses.includes(productData.stockStatus)) {
        throw new Error(`Invalid stock status: ${productData.stockStatus}`);
      }

      // Create the product
      const product = await this.Product.create(
        {
          name: productData.name,
          slug: productData.slug,
          description: productData.description,
          short_description: productData.shortDescription || null,
          price: productData.price,
          discount_price: productData.discountPrice || null,
          cost_price: productData.costPrice || null,
          sku: productData.sku,
          upc: productData.upc || null,
          ean: productData.ean || null,
          isbn: productData.isbn || null,
          brand_id: productData.brandId || null,
          stock_quantity: productData.stockQuantity || 0,
          stock_status: productData.stockStatus || 'in_stock',
          weight: productData.weight || null,
          length: productData.length || null,
          width: productData.width || null,
          height: productData.height || null,
          min_order_quantity: productData.minOrderQuantity || 1,
          status: productData.status || 'draft',
          is_featured: productData.isFeatured || false,
          is_bestseller: productData.isBestseller || false,
          is_new: productData.isNew || false,
          needs_shipping: productData.needsShipping !== false,
          tax_class: productData.taxClass || null,
          meta_title: productData.metaTitle || null,
          meta_description: productData.metaDescription || null,
          meta_keywords: productData.metaKeywords || null,
          seller_id: productData.sellerId || null,
        },
        { transaction }
      );

      // Add categories if provided
      // In the create method, modify the ProductCategory.bulkCreate section:
      if (productData.categories && productData.categories.length > 0) {
        await ProductCategory.bulkCreate(
          productData.categories.map((categoryId) => ({
            product_id: product.id,
            category_id: categoryId,
          })),
          {
            transaction,
            fields: ['product_id', 'category_id'], // Explicitly list only these fields
            ignoreDuplicates: true, // Optional: prevent duplicates
          }
        );
      }

      // Add collections if provided
      if (productData.collections && productData.collections.length > 0) {
        await ProductCollection.bulkCreate(
          productData.collections.map((collectionId) => ({
            product_id: product.id,
            collection_id: collectionId,
          })),
          { transaction }
        );
      }

      // Add attributes if provided
      // Add attributes if provided
      if (productData.attributes && productData.attributes.length > 0) {
        for (const attribute of productData.attributes) {
          // Verify attribute exists
          const attrExists = await Attribute.findByPk(attribute.attributeId, { transaction });
          if (!attrExists) {
            throw new Error(`Attribute with ID ${attribute.attributeId} not found`);
          }

          const productAttribute = await ProductAttribute.create(
            {
              product_id: product.id,
              attribute_id: attribute.attributeId,
            },
            { transaction }
          );

          // Verify attribute values exist
          if (attribute.valueIds && attribute.valueIds.length > 0) {
            const valuesExist = await AttributeValue.findAll({
              where: { id: attribute.valueIds },
              transaction,
            });

            if (valuesExist.length !== attribute.valueIds.length) {
              throw new Error('One or more attribute values not found');
            }

            await ProductAttributeValue.bulkCreate(
              attribute.valueIds.map((valueId) => ({
                product_attribute_id: productAttribute.id,
                attribute_value_id: valueId,
              })),
              { transaction }
            );
          }
        }
      }

      await transaction.commit();
      return product.id;
    } catch (err) {
      await transaction.rollback();
      console.error('Error creating product:', err);
      throw err;
    }
  }

  async findById(id, options = {}) {
    try {
      const {
        withImages = false,
        withCategories = false,
        withCollections = false,
        withAttributes = false,
        withVariations = false,
        withReviews = false,
        withBrand = false,
      } = options;

      // Build include array based on options
      const include = [];

      if (withImages) {
        include.push({
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'image_url', 'is_default', 'position'],
        });
      }

      if (withCategories) {
        include.push({
          model: Category,
          as: 'categories',
          through: { attributes: [] },
          attributes: ['id', 'name', 'slug', 'description', 'image_url'],
        });
      }

      if (withCollections) {
        include.push({
          model: Collection,
          as: 'collections',
          through: { attributes: [] },
          attributes: ['id', 'name', 'slug', 'description', 'image_url'],
        });
      }

      if (withBrand) {
        include.push({
          model: Brand,
          as: 'brand',
          attributes: ['id', 'name', 'slug', 'logo_url', 'website'],
        });
      }

      if (withAttributes) {
        include.push({
          model: Attribute,
          as: 'productAttributes',
          through: { attributes: [] },
          attributes: ['id', 'name', 'slug', 'type', 'is_filterable', 'is_visible', 'is_variation'],
          include: [
            {
              model: AttributeValue,
              as: 'values',
              through: {
                model: ProductAttributeValue,
                attributes: [],
              },
              attributes: ['id', 'value', 'slug', 'color_code', 'image_url'],
            },
          ],
        });
      }

      if (withVariations) {
        include.push({
          model: ProductVariation,
          as: 'variations',
          attributes: [
            'id',
            'sku',
            'price',
            'discount_price',
            'stock_quantity',
            'image_id',
            'is_default',
          ],
          include: [
            {
              model: Attribute,
              as: 'attributes',
              through: {
                model: VariationAttribute,
                attributes: [],
              },
              attributes: ['id', 'name', 'slug'],
            },
            {
              model: AttributeValue,
              as: 'attributeValues',
              through: {
                model: VariationAttribute,
                attributes: [],
              },
              attributes: ['id', 'value', 'slug', 'color_code', 'image_url'],
            },
            {
              model: ProductImage,
              as: 'image',
              attributes: ['id', 'image_url'],
            },
          ],
        });
      }

      if (withReviews) {
        include.push({
          model: ProductReview,
          as: 'reviews',
          where: { is_approved: true },
          required: false,
          attributes: ['id', 'rating', 'title', 'comment', 'created_at', 'user_id'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'avatar_url'],
            },
          ],
        });
      }

      const product = await this.Product.findByPk(id, {
        include,
        rejectOnEmpty: false,
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Calculate average rating if reviews are included
      if (withReviews && product.reviews && product.reviews.length > 0) {
        const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
        product.dataValues.averageRating = (totalRating / product.reviews.length).toFixed(1);
      }

      return product;
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }
  async getProductImages(productId) {
    return await ProductImage.findAll({
      where: { product_id: productId },
      order: [['position', 'ASC']],
    });
  }

  async getProductCategories(productId) {
    return await Category.findAll({
      include: [
        {
          model: ProductCategory,
          where: { product_id: productId },
          attributes: [],
        },
      ],
    });
  }

  async getProductCollections(productId) {
    return await Collection.findAll({
      include: [
        {
          model: ProductCollection,
          where: { product_id: productId },
          attributes: [],
        },
      ],
    });
  }

  // Add to ProductModel.js
  async addProductAttributes(productId, attributes, transaction) {
    if (!attributes || !attributes.length) return;

    for (const attribute of attributes) {
      const productAttribute = await ProductAttribute.create(
        {
          product_id: productId,
          attribute_id: attribute.attributeId,
        },
        { transaction }
      );

      if (attribute.valueIds && attribute.valueIds.length) {
        await ProductAttributeValue.bulkCreate(
          attribute.valueIds.map((valueId) => ({
            product_attribute_id: productAttribute.id,
            attribute_value_id: valueId,
          })),
          { transaction }
        );
      }
    }
  }

  async getProductAttributes(productId) {
    const attributes = await Attribute.findAll({
      include: [
        {
          model: ProductAttribute,
          where: { product_id: productId },
          attributes: [],
        },
        {
          model: AttributeValue,
          through: {
            model: ProductAttributeValue,
            attributes: [],
          },
        },
      ],
      group: ['Attribute.id', 'values.id'],
    });

    return attributes.map((attr) => ({
      id: attr.id,
      name: attr.name,
      slug: attr.slug,
      type: attr.type,
      values: attr.values.map((val) => ({
        id: val.id,
        value: val.value,
        slug: val.slug,
        colorCode: val.color_code,
        imageUrl: val.image_url,
      })),
    }));
  }

  async getProductVariations(productId) {
    const variations = await ProductVariation.findAll({
      where: { product_id: productId },
      include: [
        {
          model: Attribute,
          as: 'attributes',
          through: { attributes: [] },
          include: [
            {
              model: AttributeValue,
              as: 'values',
            },
          ],
        },
      ],
    });

    return variations.map((variation) => ({
      ...variation.get({ plain: true }),
      attributes: variation.attributes.map((attr) => ({
        id: attr.id,
        name: attr.name,
        values: attr.values.map((val) => ({
          id: val.id,
          value: val.value,
          slug: val.slug,
          colorCode: val.color_code,
          imageUrl: val.image_url,
        })),
      })),
    }));
  }

  async getProductReviews(productId, { approvedOnly = true } = {}) {
    const where = { product_id: productId };
    if (approvedOnly) where.is_approved = true;

    const reviews = await ProductReview.findAll({
      where,
      order: [['created_at', 'DESC']],
    });

    // Add helpful counts
    for (const review of reviews) {
      const helpfulCount = await sequelize.models.ReviewHelpfulness.count({
        where: {
          review_id: review.id,
          is_helpful: true,
        },
      });

      const notHelpfulCount = await sequelize.models.ReviewHelpfulness.count({
        where: {
          review_id: review.id,
          is_helpful: false,
        },
      });

      review.dataValues.helpful_count = helpfulCount;
      review.dataValues.not_helpful_count = notHelpfulCount;
    }

    return reviews;
  }

  async search({
    query,
    categoryId,
    collectionId,
    brandId,
    minPrice,
    maxPrice,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    limit = 20,
    offset = 0,
    sellerId,
  }) {
    const where = { status: 'published' };
    const include = [];
    const order = [[sortBy, sortOrder]];

    if (query) {
      where[Op.or] = [
        { name: { [Op.like]: `%${query}%` } },
        { description: { [Op.like]: `%${query}%` } },
        { sku: query },
      ];
    }

    if (categoryId) {
      include.push({
        model: ProductCategory,
        where: { category_id: categoryId },
        attributes: [],
      });
    }

    if (collectionId) {
      include.push({
        model: ProductCollection,
        where: { collection_id: collectionId },
        attributes: [],
      });
    }

    if (brandId) {
      where.brand_id = brandId;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }

    if (sellerId) {
      where.seller_id = sellerId;
    }

    const { count, rows } = await this.Product.findAndCountAll({
      where,
      include,
      order,
      limit,
      offset,
      distinct: true, // Important for correct count with joins
    });

    return {
      products: rows,
      total: count,
      limit,
      offset,
    };
  }

  async update(id, updates) {
    const transaction = await sequelize.transaction();
    try {
      // Update product fields
      const [affectedRows] = await this.Product.update(updates, {
        where: { id },
        transaction,
      });

      if (affectedRows === 0) {
        throw new Error('No product found with that ID');
      }

      // Update categories if provided
      if (updates.categories !== undefined) {
        await ProductCategory.destroy({
          where: { product_id: id },
          transaction,
        });

        if (updates.categories.length > 0) {
          await ProductCategory.bulkCreate(
            updates.categories.map((categoryId) => ({
              product_id: id,
              category_id: categoryId,
            })),
            { transaction }
          );
        }
      }

      // Update collections if provided
      if (updates.collections !== undefined) {
        await ProductCollection.destroy({
          where: { product_id: id },
          transaction,
        });

        if (updates.collections.length > 0) {
          await ProductCollection.bulkCreate(
            updates.collections.map((collectionId) => ({
              product_id: id,
              collection_id: collectionId,
            })),
            { transaction }
          );
        }
      }

      // Update attributes if provided
      if (updates.attributes !== undefined) {
        // First delete all existing attribute relationships
        await ProductAttribute.destroy({
          where: { product_id: id },
          transaction,
        });

        if (updates.attributes.length > 0) {
          for (const attribute of updates.attributes) {
            const productAttribute = await ProductAttribute.create(
              {
                product_id: id,
                attribute_id: attribute.attributeId,
              },
              { transaction }
            );

            await ProductAttributeValue.bulkCreate(
              attribute.valueIds.map((valueId) => ({
                product_attribute_id: productAttribute.id,
                attribute_value_id: valueId,
              })),
              { transaction }
            );
          }
        }
      }

      await transaction.commit();
      return affectedRows;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      // Delete all related records first
      await Promise.all([
        ProductCategory.destroy({ where: { product_id: id }, transaction }),
        ProductCollection.destroy({ where: { product_id: id }, transaction }),
        ProductAttribute.destroy({ where: { product_id: id }, transaction }),
        ProductImage.destroy({ where: { product_id: id }, transaction }),
        ProductTag.destroy({ where: { product_id: id }, transaction }),
        RelatedProduct.destroy({
          where: {
            [Op.or]: [{ product_id: id }, { related_product_id: id }],
          },
          transaction,
        }),
        CrossSellProduct.destroy({
          where: {
            [Op.or]: [{ product_id: id }, { cross_sell_product_id: id }],
          },
          transaction,
        }),
        UpSellProduct.destroy({
          where: {
            [Op.or]: [{ product_id: id }, { up_sell_product_id: id }],
          },
          transaction,
        }),
        ProductVariation.destroy({ where: { product_id: id }, transaction }),
      ]);

      // Finally delete the product
      const deletedRows = await this.Product.destroy({
        where: { id },
        transaction,
      });

      await transaction.commit();
      return deletedRows;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async incrementViews(productId) {
    await this.Product.increment('views_count', {
      where: { id: productId },
    });
  }

  async incrementSales(productId, quantity = 1) {
    await this.Product.increment(['sales_count', quantity], ['stock_quantity', -quantity], {
      where: { id: productId },
    });
  }
}

module.exports = ProductModel;
