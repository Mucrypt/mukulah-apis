// config/sequelizeConfig.js
require('dotenv').config();
const { mysql } = require('./envConfig');

module.exports = {
  development: {
    username: mysql.user,
    password: mysql.password,
    database: 'ecommerce_db', // ✅ Your actual DB name
    host: mysql.host,
    port: mysql.port || 3306,
    dialect: 'mysql', // ✅ Required for Sequelize CLI
  },
  test: {
    username: 'root',
    password: null,
    database: 'test_db',
    host: '127.0.0.1',
    dialect: 'mysql',
  },
  production: {
    username: mysql.user,
    password: mysql.password,
    database: 'ecommerce_db',
    host: mysql.host,
    port: mysql.port || 3306,
    dialect: 'mysql',
  },
};
