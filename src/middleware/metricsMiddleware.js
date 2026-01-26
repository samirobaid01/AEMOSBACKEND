const metricsManager = require('../utils/metricsManager');
const logger = require('../utils/logger');

function normalizeRoute(path) {
  if (!path) return 'unknown';
  
  const route = path
    .replace(/\/api\/v1\//, '')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/gi, '/:uuid')
    .replace(/\/[^/]+$/, '/:param');
  
  return `/api/v1/${route}`;
}

const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const route = normalizeRoute(req.route?.path || req.path);
    const method = req.method;
    const statusCode = String(res.statusCode);

    try {
      metricsManager.observeHistogram('http_request_duration_seconds', {
        method: String(method),
        route: String(route),
        status_code: statusCode
      }, duration);

      metricsManager.incrementCounter('http_requests_total', {
        method: String(method),
        route: String(route),
        status_code: statusCode
      });
    } catch (error) {
      logger.warn('Failed to record HTTP metrics', {
        error: error.message,
        method,
        route,
        statusCode
      });
    }
  });
  
  next();
};

module.exports = metricsMiddleware;
