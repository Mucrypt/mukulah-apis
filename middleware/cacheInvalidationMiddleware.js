// middleware/cacheInvalidationMiddleware.js
const rateLimit = require('express-rate-limit');

const cacheInvalidationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many cache invalidation requests, please try again later',
});

module.exports = cacheInvalidationLimiter;
