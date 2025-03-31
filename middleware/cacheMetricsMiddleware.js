// middleware/cacheMetricsMiddleware.js
module.exports = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const cacheStatus = res.getHeader('X-Cache-Status') || 'miss';

    // Send metrics to your monitoring system
    metrics.timing('api_response_time', duration, {
      path: req.path,
      method: req.method,
      cache: cacheStatus,
    });

    metrics.increment('api_requests_total', {
      path: req.path,
      method: req.method,
      status: res.statusCode,
      cache: cacheStatus,
    });
  });

  next();
};
// middleware/cacheMetricsMiddleware.js