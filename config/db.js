// backend/config/db.js
const mysql = require('mysql2/promise');
const { mysql: dbConfig } = require('./envConfig');
const path = require('path');
const { Sequelize } = require('sequelize');
const Umzug = require('umzug');

// Initialize Sequelize instance
const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
  host: dbConfig.host,
  dialect: 'mysql',
  port: dbConfig.port,
  logging: console.log ,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  timezone: '+02:00',
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    connectAttributes: {
      sql_mode: 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION',
    },
  },
  define: {
    underscored: true,
    paranoid: false,
    freezeTableName: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    defaultScope: {
      attributes: { exclude: ['deleted_at'] },
    },
  },
});

// Create MySQL connection pool
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
  timezone: '+00:00',
  decimalNumbers: true,
  namedPlaceholders: true,
  charset: 'utf8mb4',
  supportBigNumbers: true,
  bigNumberStrings: true,
});

// Database connection test
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

// Migration setup
const setupMigrations = async () => {
  const umzug = new Umzug({
    storage: 'sequelize',
    storageOptions: { sequelize },
    migrations: {
      params: [sequelize.getQueryInterface(), Sequelize],
      path: path.join(__dirname, '../database/migrations'),
      pattern: /\.js$/,
    },
  });

  try {
    await umzug.up();
    console.log('✅ All migrations executed successfully');
  } catch (err) {
    console.error('❌ Migration error:', err);
    throw err;
  }
};

// Model synchronization
const syncModels = async () => {
  try {
    // Load models
    require('../models/entities/Product');
    require('../models/entities/Category');
    // Load other models as needed...

    // Define associations
    require('../models/associations');

    // Sync models without altering tables
    await sequelize.sync({ alter: false });
    console.log('✅ Models synchronized');
  } catch (err) {
    console.error('❌ Model synchronization error:', err);
    throw err;
  }
};

// Initialize database
const initializeDatabase = async () => {
  try {
    await testConnection();
    await sequelize.authenticate();
    console.log('✅ Sequelize connected successfully');

    await setupMigrations();
    await syncModels();

    // Additional initialization if needed
    await cleanupDuplicateIndexes();

    return true;
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    process.exit(1);
  }
};

// Clean up duplicate indexes
const cleanupDuplicateIndexes = async () => {
  try {
    const [indexes] = await sequelize.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_NAME = 'products' 
      AND TABLE_SCHEMA = '${dbConfig.database}'
      AND INDEX_NAME != 'PRIMARY'
    `);

    const duplicates = indexes.filter(
      (index) =>
        /_(2|3|4|5|6|7|8|9)$/.test(index.INDEX_NAME) ||
        (index.INDEX_NAME !== 'slug' && index.INDEX_NAME.startsWith('slug')) ||
        (index.INDEX_NAME !== 'sku' && index.INDEX_NAME.startsWith('sku'))
    );

    for (const index of duplicates) {
      try {
        await sequelize.query(`ALTER TABLE products DROP INDEX \`${index.INDEX_NAME}\``);
      } catch (err) {
        console.log(`⚠️ Could not drop index ${index.INDEX_NAME}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error during index cleanup:', err.message);
  }
};

// Health check
const healthCheck = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();

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

// Check if table exists
const tableExists = async (connection, tableName) => {
  const [tables] = await connection.query(`SHOW TABLES LIKE ?`, [tableName]);
  return tables.length > 0;
};

module.exports = {
  pool,
  sequelize,
  testConnection,
  initializeDatabase,
  healthCheck,
  tableExists,
};
