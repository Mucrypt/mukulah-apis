// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit to 20 POST requests per IP
  message: {
    status: 'fail',
    message: 'Too many requests, please try again later.',
  },
});

module.exports = postLimiter;
