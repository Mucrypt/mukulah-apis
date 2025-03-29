const { pool } = require('../config/db');

class BaseController {
  constructor() {
    this.pool = pool;
  }

  async executeQuery(query, params = []) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      const [results] = await connection.query(query, params);
      return results;
    } catch (err) {
      console.error('Database query error:', err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  successResponse(res, data, message = 'Success', statusCode = 200) {
    res.status(statusCode).json({
      status: 'success',
      message,
      data,
    });
  }

  errorResponse(res, message = 'Error occurred', statusCode = 400) {
    res.status(statusCode).json({
      status: 'error',
      message,
    });
  }
}

module.exports = BaseController;
