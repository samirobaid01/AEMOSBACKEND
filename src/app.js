const express = require('express');
const cors = require('cors');
const path = require('path');
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const deviceStateRoutes = require('./routes/deviceStateRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const areaRoutes = require('./routes/areaRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const dataStreamRoutes = require('./routes/dataStreamRoutes');
const deviceTokenRoutes = require('./routes/deviceTokenRoutes');
const { errorHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');
const features = require('./config/features');
const compression = require('compression');
const responseTime = require('response-time');
// Import sequelize for the health check
const sequelize = require('./config/database');

// Initialize Express app
const app = express();

// Enable CORS for all routes
app.use(cors());

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to log all requests with full path details
app.use((req, res, next) => {
  console.log(`*** REQUEST: ${req.method} ${req.originalUrl} (${new Date().toISOString()}) ***`);
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Middleware to restrict routes to localhost only
const localhostOnly = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('localhost');
  
  // Allow access only from localhost and in development environment
  if ((isLocalhost || process.env.NODE_ENV === 'development') && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'This endpoint is restricted to localhost only'
  });
};

// Middleware specifically for socketClient.html
app.get('/socketClient.html', localhostOnly, (req, res, next) => {
  next();
});

// Serve static files from the 'public' directory (after the localhostOnly middleware for socketClient.html)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Apply middleware based on configuration
if (features.security.helmet) {
  const helmet = require('helmet');
  app.use(helmet());
  logger.info('Helmet security headers enabled');
}

if (features.security.hpp) {
  const hpp = require('hpp');
  app.use(hpp());
  logger.info('HTTP Parameter Pollution protection enabled');
}

if (features.security.rateLimit.enabled) {
  const { rateLimit } = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: features.security.rateLimit.windowMs,
    max: features.security.rateLimit.max,
    standardHeaders: true,
    message: 'Too many requests, please try again later'
  });
  app.use('/api', limiter);
  logger.info(`Rate limiting enabled: ${features.security.rateLimit.max} requests per ${features.security.rateLimit.windowMs/60000} minutes`);
}

if (features.performance.compression) {
  app.use(compression());
  logger.info('Response compression enabled');
}

if (features.performance.responseTime.enabled) {
  app.use(responseTime((req, res, time) => {
    if (time > features.performance.responseTime.threshold) {
      logger.warn(`Slow response: ${req.method} ${req.originalUrl} - ${time.toFixed(2)}ms`);
    }
  }));
  logger.info(`Response time tracking enabled (threshold: ${features.performance.responseTime.threshold}ms)`);
}

// API health check route
app.get('/api/v1/health', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date(),
    services: {
      database: { status: 'checking' }
    }
  };
  
  try {
    await sequelize.authenticate();
    checks.services.database.status = 'ok';
  } catch (error) {
    checks.services.database.status = 'error';
    checks.services.database.message = error.message;
    checks.status = 'error';
  }
  
  const statusCode = checks.status === 'ok' ? 200 : 500;
  res.status(statusCode).json(checks);
});

app.get('/api/v1/health/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

app.get('/api/v1/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Rule engine endpoints - defined BEFORE index routes to ensure precedence
app.get('/api/v1/rule-engine/health', (req, res) => {
  try {
    // Only import rule engine if not disabled
    if (process.env.DISABLE_RULE_ENGINE === 'true') {
      return res.status(503).json({
        status: 'error',
        message: 'Rule engine disabled via environment variable'
      });
    }
    
    // Try to require the rule engine - this will work after server initialization
    const { ruleEngine } = require('./ruleEngine');
    
    if (ruleEngine && ruleEngine.getHealthStatus) {
      const healthStatus = ruleEngine.getHealthStatus();
      res.status(200).json({
        status: 'success',
        data: healthStatus
      });
    } else {
      res.status(503).json({
        status: 'error',
        message: 'Rule engine not yet initialized'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Rule engine not available',
      error: error.message
    });
  }
});

app.get('/api/v1/rule-engine/metrics', (req, res) => {
  try {
    // Only import rule engine if not disabled
    if (process.env.DISABLE_RULE_ENGINE === 'true') {
      return res.status(503).json({
        status: 'error',
        message: 'Rule engine disabled via environment variable'
      });
    }
    
    // Try to require the rule engine - this will work after server initialization
    const { ruleEngine } = require('./ruleEngine');
    
    if (ruleEngine && ruleEngine.getMetrics) {
      const metrics = ruleEngine.getMetrics();
      res.status(200).json({
        status: 'success',
        data: metrics
      });
    } else {
      res.status(503).json({
        status: 'error', 
        message: 'Rule engine not yet initialized'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Rule engine not available',
      error: error.message
    });
  }
});

// Mount index routes first
app.use('/api/v1', indexRoutes);

// Mount API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
// app.use('/api/v1/device-states', deviceStateRoutes); // Comment this out - already handled in index.js
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/areas', areaRoutes);
app.use('/api/v1/sensors', sensorRoutes);
app.use('/api/v1/data-streams', dataStreamRoutes);

// Mount device token routes with multiple path aliases for compatibility
console.log('*** MOUNTING DEVICE TOKEN ROUTES... ***');

// Debug middleware to log all requests to device token routes
const deviceTokenDebugMiddleware = (req, res, next) => {
  console.log(`*** HIT: ${req.method} ${req.originalUrl} ***`);
  next();
};

// Apply debug middleware first
app.use('/api/v1/device-tokens', deviceTokenDebugMiddleware, deviceTokenRoutes);
app.use('/api/v1/devicetokens', deviceTokenDebugMiddleware, deviceTokenRoutes);
app.use('/api/v1/devicetoken', deviceTokenDebugMiddleware, deviceTokenRoutes);

// Test route accessible directly from app.js
app.get('/api/v1/app-device-token-test', (req, res) => {
  console.log('*** App-level device token test hit ***');
  res.status(200).json({
    status: 'success',
    message: 'App-level device token test route works!'
  });
});

// Test route to verify server is working
app.get('/test', (req, res) => {
  console.log('Test route hit!');
  res.status(200).json({
    status: 'success',
    message: 'Server is running correctly!'
  });
});

// Handle undefined routes - this should be the LAST route
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server!`
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app; 