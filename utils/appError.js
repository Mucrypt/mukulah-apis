// utils/appError.js
class AppError extends Error {
  constructor(message, statusCode, errorType = 'operational', details = {}) {
    super(message);

    // Basic error properties
    this.statusCode = statusCode || 500;
    this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    // Enhanced error classification
    this.errorType = errorType;
    this.details = details;

    // Error tracing
    Error.captureStackTrace(this, this.constructor);

    // Log the error immediately (optional)
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${this.timestamp}] ${this.stack}`);
    }
  }

  // Static factory methods for common error types
  static badRequest(message, details) {
    return new AppError(message, 400, 'validation', details);
  }

  static unauthorized(message = 'Unauthorized access') {
    return new AppError(message, 401, 'authentication');
  }

  static forbidden(message = 'Forbidden resource') {
    return new AppError(message, 403, 'authorization');
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404, 'resource');
  }

  static conflict(message = 'Resource conflict') {
    return new AppError(message, 409, 'resource');
  }

  static tooManyRequests(message = 'Too many requests') {
    return new AppError(message, 429, 'rate_limit');
  }

  static validationError(message = 'Validation failed', errors) {
    return new AppError(message, 422, 'validation', { errors });
  }

  static databaseError(message = 'Database operation failed') {
    return new AppError(message, 500, 'database');
  }

  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return new AppError(message, 503, 'service');
  }

  // Method to standardize error response format
  toResponse() {
    return {
      status: this.status,
      statusCode: this.statusCode,
      message: this.message,
      ...(this.details && Object.keys(this.details).length > 0 && { details: this.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
      timestamp: this.timestamp,
    };
  }
}

// Export error types for consistent usage
const ERROR_TYPES = {
  OPERATIONAL: 'operational',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  RESOURCE: 'resource',
  RATE_LIMIT: 'rate_limit',
  SERVICE: 'service',
  THIRD_PARTY: 'third_party',
};

module.exports = {
  AppError,
  ERROR_TYPES,
};
