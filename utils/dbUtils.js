const { pool } = require('../config/db');

/**
 * Executes a function within a database transaction.
 * @param {Function} callback - The function to execute within the transaction.
 * @returns {Promise<any>} - The result of the callback function.
 */
const withTransaction = async (callback) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const result = await callback(connection);

    await connection.commit();
    return result;
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { withTransaction };
