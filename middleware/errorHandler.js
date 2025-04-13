// middleware/errorHandler.js
const { AppError, ERROR_TYPES } = require('../utils/appError');

const handleJWTError = () =>
  new AppError('Invalid authentication token', 401, ERROR_TYPES.AUTHENTICATION);

const handleJWTExpiredError = () =>
  new AppError('Authentication token expired', 401, ERROR_TYPES.AUTHENTICATION);

const handleCastErrorDB = (err) => AppError.badRequest(`Invalid ${err.path}: ${err.value}`);

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
  return AppError.conflict(`Duplicate field value: ${value}`);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  return AppError.validationError('Invalid input data', { errors });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;

  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // Send error response
  res.status(error.statusCode).json(error.toResponse());
};
