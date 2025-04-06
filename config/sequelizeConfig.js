// backend/config/config.js
const { mysql } = require('./envConfig');

module.exports = {
  development: {
    username: mysql.user,
    password: mysql.password,
    database: mysql.database,
    host: mysql.host,
    port: mysql.port,
    dialect: 'mysql',
    dialectOptions: {
      bigNumberStrings: true,
      supportBigNumbers: true,
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      underscored: true,
      freezeTableName: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
  },
  test: {
    // ... similar to development
  },
  production: {
    // ... similar to development
  },
};
