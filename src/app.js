const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const areaRoutes = require('./routes/areaRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const { errorHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');
const features = require('./config/features');
const compression = require('compression');
const responseTime = require('response-time');
const sequelize = require('./config/database');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

// Initialize Express app
const app = express();

// Enable CORS with specific configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Apply middleware based on configuration
if (features.security.helmet) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'img-src': ["'self'", 'data:', 'blob:'],
      },
    },
  }));
  logger.info('Helmet security headers enabled');
}

if (features.security.hpp) {
  app.use(hpp());
  logger.info('HTTP Parameter Pollution protection enabled');
}

if (features.security.rateLimit.enabled) {
  const limiter = require('express-rate-limit')({
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

// Mount API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/areas', areaRoutes);
app.use('/api/v1/sensors', sensorRoutes);

// Handle undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server!`
  });
});

// Global error handler
app.use(errorHandler);

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    // Exclude API routes from the catch-all
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
  });
}

module.exports = app; 