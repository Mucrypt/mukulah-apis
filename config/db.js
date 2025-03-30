// backend/config/db.js
const mysql = require('mysql2/promise');
const { mysql: dbConfig } = require('./envConfig');
const { readFileSync } = require('fs');
const path = require('path');

// SQL schema files (for better organization)
const SCHEMA_FILES = {
  categories: path.join(__dirname, '../database/schemas/categories.sql'),
  brands: path.join(__dirname, '../database/schemas/brands.sql'),
  attributes: path.join(__dirname, '../database/schemas/attributes.sql'),
  attribute_values: path.join(__dirname, '../database/schemas/attribute_values.sql'),
  collections: path.join(__dirname, '../database/schemas/collections.sql'),
  products: path.join(__dirname, '../database/schemas/products.sql'),
  product_images: path.join(__dirname, '../database/schemas/product_images.sql'),
  product_videos: path.join(__dirname, '../database/schemas/product_videos.sql'),
  product_categories: path.join(__dirname, '../database/schemas/product_categories.sql'),
  product_collections: path.join(__dirname, '../database/schemas/product_collections.sql'),
  product_attributes: path.join(__dirname, '../database/schemas/product_attributes.sql'),
  product_attribute_values: path.join(
    __dirname,
    '../database/schemas/product_attribute_values.sql'
  ),
  product_variations: path.join(__dirname, '../database/schemas/product_variations.sql'),
  variation_attributes: path.join(__dirname, '../database/schemas/variation_attributes.sql'),
  tags: path.join(__dirname, '../database/schemas/tags.sql'),
  product_tags: path.join(__dirname, '../database/schemas/product_tags.sql'),
  related_products: path.join(__dirname, '../database/schemas/related_products.sql'),
  cross_sell_products: path.join(__dirname, '../database/schemas/cross_sell_products.sql'),
  up_sell_products: path.join(__dirname, '../database/schemas/up_sell_products.sql'),
  product_reviews: path.join(__dirname, '../database/schemas/product_reviews.sql'),
  review_replies: path.join(__dirname, '../database/schemas/review_replies.sql'),
  review_helpfulness: path.join(__dirname, '../database/schemas/review_helpfulness.sql'),
  admin_logs: path.join(__dirname, '../database/schemas/admin_logs.sql'),
};

// Create MySQL connection pool with enhanced configuration
const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 100,
  connectTimeout: 10000,
  timezone: '+00:00', // For UTC (recommended for database consistency)
  decimalNumbers: true,
  namedPlaceholders: true,
  charset: 'utf8mb4',
  supportBigNumbers: true,
  bigNumberStrings: true,
});

/**
 * Test database connection
 */
const testConnection = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log('✅ MySQL connected successfully');
    return true;
  } catch (err) {
    console.error('❌ MySQL connection error:', err.message);
    throw err;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Execute a SQL file to create tables
 */
const executeSchemaFile = async (connection, tableName) => {
  try {
    const sql = readFileSync(SCHEMA_FILES[tableName], 'utf8');
    await connection.query(sql);
    console.log(`✅ Created ${tableName} table`);
  } catch (err) {
    console.error(`❌ Error creating ${tableName} table:`, err.message);
    throw err;
  }
};

/**
 * Check if table exists
 */
const tableExists = async (connection, tableName) => {
  const [tables] = await connection.query(`SHOW TABLES LIKE ?`, [tableName]);
  return tables.length > 0;
};

/**
 * Create additional indexes for performance
 */
const createAdditionalIndexes = async (connection) => {
  const indexes = [
    // Fixed syntax error - added missing parenthesis
    `CREATE INDEX IF NOT EXISTS idx_products_search ON products(name, description(255), status, average_rating)`,
    `CREATE INDEX IF NOT EXISTS idx_category_tree ON categories(lft, rgt, depth)`,
    `CREATE INDEX IF NOT EXISTS idx_collection_dates ON collections(start_date, end_date, status)`,
    `CREATE INDEX IF NOT EXISTS idx_product_reviews ON product_reviews(product_id, is_approved, rating)`,
  ];

  for (const sql of indexes) {
    try {
      await connection.query(sql);
    } catch (err) {
      console.error('Error creating index:', err.message);
    }
  }
};

/**
 * Initialize the complete database schema
 */
const initializeDatabase = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log('✅ MySQL connected successfully');

    // Check and create tables in proper dependency order
    const tablesToCreate = [
      'categories',
      'brands',
      'attributes',
      'attribute_values',
      'collections',
      'products',
      'product_images',
      'product_videos',
      'product_categories',
      'product_collections',
      'product_attributes',
      'product_attribute_values',
      'product_variations',
      'variation_attributes',
      'tags',
      'product_tags',
      'related_products',
      'cross_sell_products',
      'up_sell_products',
      'product_reviews',
      'review_replies',
      'review_helpfulness',
      'admin_logs',
    ];

    for (const table of tablesToCreate) {
      if (!(await tableExists(connection, table))) {
        await executeSchemaFile(connection, table);
      }
    }

    // Create indexes after all tables are created
    await createAdditionalIndexes(connection);

    console.log('✅ Database schema initialized successfully');
    return true;
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    throw err;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Database health check
 */
const healthCheck = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();

    // Check some critical tables
    const criticalTables = ['products', 'categories', 'collections'];
    for (const table of criticalTables) {
      const exists = await tableExists(connection, table);
      if (!exists) {
        throw new Error(`Critical table ${table} missing`);
      }
    }

    return true;
  } catch (err) {
    console.error('Database health check failed:', err.message);
    return false;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  pool,
  testConnection,
  initializeDatabase,
  healthCheck,
  tableExists,
  executeSchemaFile,
};
