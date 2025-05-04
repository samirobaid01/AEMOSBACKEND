const express = require('express');
const deviceRoutes = require('./deviceRoutes');
// Import sequelize for the health check
const sequelize = require('../config/database');
// TODO: Import other routes as you create them
// const userRoutes = require('./userRoutes');
// const organizationRoutes = require('./organizationRoutes');
// etc.

const router = express.Router();

// API health check route
router.get('/health', async (req, res) => {
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

router.get('/health/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// API v1 routes
router.use('/devices', deviceRoutes);
// TODO: Mount other routes as you create them
// router.use('/users', userRoutes);
// router.use('/organizations', organizationRoutes);
// etc.

// Handle undefined routes - use this instead of catch-all wildcard
router.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server!`
  });
});

module.exports = router;