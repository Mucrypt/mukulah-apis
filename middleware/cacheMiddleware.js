const cacheService = require('../services/cacheService');

/**
 * Middleware to cache responses for a specified duration.
 * @param {number} ttl - Time-to-live in seconds.
 */
const cacheMiddleware = (ttl) => async (req, res, next) => {
  const key = `cache:${req.originalUrl}`;

  try {
    const cachedData = await cacheService.get(key);
    if (cachedData) {
      res.json(JSON.parse(cachedData)); // Parse cached JSON
      return;
    }
  } catch (error) {
    console.error('Error parsing cached data:', error.message);
    next(); // Proceed without cached data
  }

  res.sendResponse = res.json.bind(res);
  res.json = async (body) => {
    try {
      if (typeof body === 'object') {
        await cacheService.set(key, JSON.stringify(body), ttl); // Stringify before caching
      }
    } catch (error) {
      console.error('Error caching response:', error.message);
    }
    res.sendResponse(body);
  };

  next();
};

module.exports = cacheMiddleware;
