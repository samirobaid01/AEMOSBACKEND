const express = require('express');
const deviceRoutes = require('./deviceRoutes');
// TODO: Import other routes as you create them
// const userRoutes = require('./userRoutes');
// const organizationRoutes = require('./organizationRoutes');
// etc.

const router = express.Router();

// API health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'AEMOS API is running'
  });
});

// API v1 routes
router.use('/devices', deviceRoutes);
// TODO: Mount other routes as you create them
// router.use('/users', userRoutes);
// router.use('/organizations', organizationRoutes);
// etc.

// Handle undefined routes - use this instead of catch-all wildcard
router.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server!`
  });
});

module.exports = router;