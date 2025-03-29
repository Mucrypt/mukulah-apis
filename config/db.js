// backend/config/db.js
const mysql = require('mysql2/promise');
const { mysql: dbConfig } = require('./envConfig');

// Create MySQL connection pool
const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// Test database connection
const testConnection = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log('✅ MySQL connected successfully');

    // Verify users table exists
    const [tables] = await connection.query(`SHOW TABLES LIKE 'users'`);

    if (tables.length === 0) {
      console.warn('⚠️ Users table does not exist');
      // Create users table if it doesn't exist
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role ENUM('customer', 'admin', 'superAdmin') DEFAULT 'customer',
          password_reset_token VARCHAR(255),
          password_reset_expires DATETIME,
          password_changed_at DATETIME,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created users table');
    }
  } catch (err) {
    console.error('❌ MySQL connection error:', err.message);
    console.error('Connection details:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
    });

    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n👉 Possible solutions:');
      console.error('1. Verify MySQL credentials in .env file');
      console.error('2. Check user privileges');
      console.error('3. Ensure MySQL server is running');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('\n👉 MySQL server is not running or connection refused');
    }

    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  pool,
  testConnection,
};
