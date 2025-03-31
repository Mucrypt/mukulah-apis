// seeder.js
const dotenv = require('dotenv');
const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');
const User = require('./models/userModel');
const Product = require('./models/ProductModel');
const ProductImage = require('./models/ProductImageModel');
const Category = require('./models/CategoryModel');
const Collection = require('./models/CollectionModel');
const Brand = require('./models/BrandModel'); // Import Brand model
const Attribute = require('./models/AttributeModel'); // Import Attribute model
const AttributeValue = require('./models/AttributeValueModel'); // Import attribute value model
const ProductAttribute = require('./models/ProductAttributeModel'); // Correctly import ProductAttribute
const products = require('./data/products');
const categories = require('./data/categories');
const productImages = require('./data/productImages'); // Import productImages
const collections = require('./data/collections'); // Import collections data
const brands = require('./data/brands'); // Import brand data
const attributes = require('./data/attributes'); // Import attributes data
const attributeValues = require('./data/attributeValues'); // Import attribute values data
const productAttributes = require('./data/productAttributes'); // Import product attributes data

dotenv.config();

const clearDatabase = async () => {
  try {
    console.log('🧹 Clearing existing data...');

    // Disable foreign key checks temporarily
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    // Clear data in correct relational order (child tables first)
    const tablesToClear = [
      'product_attribute_values',
      'product_attributes',
      'product_images',
      'product_categories',
      'product_collections',
      'product_variations',
      'products',
      'collections',
      'categories',
      'brands',
      'users',
    ];

    for (const table of tablesToClear) {
      await pool.query(`DELETE FROM ${table}`);
      console.log(`✅ Deleted all rows from: ${table}`);
    }

    // Reset auto-increment counters (useful during development)
    for (const table of tablesToClear) {
      await pool.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      console.log(`♻️  Reset auto-increment for: ${table}`);
    }

    // Re-enable foreign key checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✨ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
};

const generateUniqueSlug = (slug, existingSlugs) => {
  let uniqueSlug = slug;
  let counter = 1;
  while (existingSlugs.has(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  existingSlugs.add(uniqueSlug);
  return uniqueSlug;
};

const seedAttributesAndValues = async () => {
  console.log('🌟 Seeding attributes and values...');
  const attributeModel = new Attribute(pool);
  const attributeValueModel = new AttributeValue(pool);

  const attributeMap = {};
  for (const attr of attributes) {
    try {
      const [existing] = await pool.execute('SELECT id FROM attributes WHERE slug = ?', [
        attr.slug,
      ]);

      let attributeId;
      if (existing.length > 0) {
        attributeId = existing[0].id;
      } else {
        const [result] = await pool.execute(
          `INSERT INTO attributes (name, slug, type, is_filterable, is_visible, is_variation) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [attr.name, attr.slug, attr.type, false, true, false]
        );
        attributeId = result.insertId;
        console.log(`✅ Attribute seeded: ${attr.name}`);
      }

      attributeMap[attr.slug] = attributeId;
    } catch (error) {
      console.error(`❌ Error seeding attribute: ${attr.name}`, error);
      throw error;
    }
  }

  for (const value of attributeValues) {
    const attributeId = attributeMap[value.attribute_id];
    if (!attributeId) {
      continue;
    }

    try {
      const [existing] = await pool.execute(
        'SELECT id FROM attribute_values WHERE attribute_id = ? AND slug = ?',
        [attributeId, value.slug]
      );

      if (existing.length > 0) {
        continue;
      }

      await attributeValueModel.create({
        attributeId,
        value: value.value,
        slug: value.slug,
        colorCode: value.color_code || null,
        imageUrl: value.image_url || null,
      });
      console.log(`✅ Attribute value seeded: ${value.value}`);
    } catch (error) {
      console.error(`❌ Error seeding attribute value: ${value.value}`, error);
      throw error;
    }
  }
};

const seedProductAttributes = async () => {
  console.log('🔗 Seeding product attributes...');
  const productAttributeModel = new ProductAttribute(pool);

  // Fetch all attributes and map their slugs to IDs
  const [attributes] = await pool.execute('SELECT id, slug FROM attributes');
  const attributeMap = attributes.reduce((map, attr) => {
    map[attr.slug] = attr.id;
    return map;
  }, {});

  for (const pa of productAttributes) {
    const attributeId = attributeMap[pa.attribute_slug]; // Use slug to find the correct ID
    if (!attributeId) {
      console.warn(
        `⚠️ Skipping product attribute: Product ID ${pa.product_id}, Attribute Slug ${pa.attribute_slug} due to missing reference`
      );
      continue;
    }

    if (!pa.product_id) {
      console.warn(
        `⚠️ Skipping product attribute: Missing Product ID for Attribute Slug ${pa.attribute_slug}`
      );
      continue;
    }

    try {
      console.log(
        `Attempting to seed product attribute: Product ID ${pa.product_id}, Attribute ID ${attributeId}`
      );
      await productAttributeModel.create({
        productId: pa.product_id,
        attributeId,
      });
      console.log(
        `✅ Product attribute seeded: Product ID ${pa.product_id}, Attribute ID ${attributeId}`
      );
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.warn(
          `⚠️ Skipping product attribute: Product ID ${pa.product_id}, Attribute ID ${attributeId} due to missing reference`
        );
      } else {
        console.error(
          `❌ Error seeding product attribute: Product ID ${pa.product_id}, Attribute ID ${attributeId}`,
          error
        );
      }
    }
  }
};

const seedData = async () => {
  try {
    console.log('🚀 Starting database seeding...');

    // First clear all existing data
    await clearDatabase();

    // Seed attributes and values
    await seedAttributesAndValues();

    // Seed product attributes
    await seedProductAttributes();

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'romeomukulah@gmail.com',
      password: 'Yaah3813@@',
      role: 'admin',
    });

    console.log('✅ Admin user created:', admin.email);

    const categoryModel = new Category(pool);
    const collectionModel = new Collection(pool);
    const productModel = new Product(pool);
    const imageModel = new ProductImage(pool);
    const brandModel = new Brand(pool);

    const categoryMap = {};
    const collectionMap = {};
    const existingSlugs = new Set();

    // Insert brands
    console.log('🏷️ Seeding brands...');
    for (const brand of brands) {
      await brandModel.create({
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        logoUrl: brand.logoUrl,
        websiteUrl: brand.websiteUrl,
      });
      console.log(`✅ Brand seeded: ${brand.name}`);
    }
    console.log(`✅ Seeded ${brands.length} brands`);

    // Insert categories and collections
    for (const cat of categories) {
      const categorySlug = generateUniqueSlug(
        cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
        existingSlugs
      );

      const categoryId = await categoryModel.create({
        name: cat.name,
        slug: categorySlug,
        description: cat.description || null,
        imageUrl: cat.image || null,
      });

      categoryMap[cat.name] = categoryId;

      if (Array.isArray(cat.collections)) {
        for (const col of cat.collections) {
          const collectionSlug = generateUniqueSlug(
            col.slug || col.name.toLowerCase().replace(/\s+/g, '-'),
            existingSlugs
          );

          const collectionId = await collectionModel.create({
            name: col.name,
            slug: collectionSlug,
            imageUrl: col.image || null,
            categoryId,
          });
          collectionMap[col.name] = collectionId;
        }
      }
    }

    // Insert products
    for (const p of products) {
      const productData = {
        name: p.name,
        slug: p.slug || p.name.toLowerCase().replace(/\s+/g, '-'),
        description: p.description || `${p.name} description`,
        shortDescription: p.shortDescription || null,
        price: p.price || 0,
        discountPrice: p.discountPrice || null,
        costPrice: p.costPrice || null,
        sku: p.sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
        upc: p.upc || null,
        ean: p.ean || null,
        isbn: p.isbn || null,
        brandId: p.brandId || null,
        stockQuantity: p.stockQuantity || 10,
        stockStatus: p.stockStatus || 'in_stock',
        weight: p.weight || null,
        length: p.length || null,
        width: p.width || null,
        height: p.height || null,
        minOrderQuantity: p.minOrderQuantity || 1,
        status: p.status || 'published',
        isFeatured: p.isFeatured || false,
        isBestseller: p.isBestseller || false,
        isNew: p.isNew || true,
        needsShipping: p.needsShipping !== false,
        taxClass: p.taxClass || null,
        metaTitle: p.metaTitle || null,
        metaDescription: p.metaDescription || null,
        metaKeywords: p.metaKeywords || null,
        categories: [categoryMap[p.category] || null], // Handle missing categories
        collections: Array.isArray(p.collections)
          ? p.collections.map((col) => collectionMap[col]).filter(Boolean)
          : [],
        attributes: p.attributes || [],
      };

      if (!productData.categories[0]) {
        console.warn(`⚠️ Skipping product: ${p.name} due to missing category`);
        continue; // Skip products with invalid categories
      }

      const productId = await productModel.create(productData);

      // Map product ID for use in productImages
      p.id = productId;

      if (Array.isArray(p.images)) {
        for (let i = 0; i < p.images.length; i++) {
          try {
            await imageModel.create({
              productId,
              url: p.images[i],
              altText: `${p.name} Image ${i + 1}`,
              isPrimary: i === 0,
              position: i,
            });
          } catch (error) {
            console.warn(`⚠️ Skipping image for product: ${p.name} due to foreign key constraint`);
          }
        }
      }
    }

    // Insert product variations
    for (const p of products) {
      if (p.variants && p.variants.length > 0) {
        const productVariationModel = new (require('./models/ProductVariationModel'))(pool);

        for (const variant of p.variants) {
          console.log(`Seeding variant for product ID ${p.id}:`, variant); // Debugging log

          // Map attributeValueId for each attribute
          const attributesWithIds = variant.attributes
            .map((attr) => {
              const attributeValue = attributeValues.find(
                (av) => av.attribute_id === attr.attributeId && av.slug === attr.valueId // Match by attribute_id and slug
              );
              if (!attributeValue) {
                console.warn(
                  `⚠️ Could not find attribute value for attributeId=${attr.attributeId}, slug=${attr.valueId}`
                );
                return null; // Skip invalid attributes
              }
              return {
                attributeId: attr.attributeId,
                valueId: attr.valueId,
                attributeValueId: attributeValue.id || null, // Ensure attributeValueId is included
              };
            })
            .filter(Boolean); // Remove null entries

          if (attributesWithIds.length === 0) {
            console.warn(`⚠️ Skipping variant for product ID ${p.id} due to missing attributes`);
            continue; // Skip variants with no valid attributes
          }

          await productVariationModel.create({
            productId: p.id,
            sku: variant.sku,
            price: variant.price,
            stockQuantity: variant.stockQuantity || 0,
            attributes: attributesWithIds, // Pass attributes with attributeValueId
          });
        }
      }
    }

    // Ensure productImages references valid product IDs
    console.log('🖼️ Seeding product images...');
    for (const img of productImages) {
      const productExists = products.find((p) => p.id === img.product_id);
      if (!productExists) {
        console.warn(`⚠️ Skipping image for non-existent product ID: ${img.product_id}`);
        continue;
      }

      await imageModel.create({
        productId: img.product_id,
        url: img.url,
        altText: img.alt_text,
        isPrimary: img.is_primary,
        position: img.position,
      });
    }
    console.log(`✅ Seeded ${productImages.length} product images`);

    // Insert collections
    console.log('📚 Seeding collections...');
    for (const col of collections) {
      const uniqueSlug = generateUniqueSlug(col.slug, existingSlugs);
      await collectionModel.create({
        name: col.name,
        slug: uniqueSlug,
        description: col.description,
        imageUrl: col.image_url,
        categoryId: col.category_id,
        startDate: col.start_date || null,
        endDate: col.end_date || null,
      });
      console.log(`✅ Collection seeded: ${col.name} (slug: ${uniqueSlug})`);
    }

    console.log(`✅ Seeded ${collections.length} collections`);

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
