const express = require('express');
const deviceTokenController = require('../controllers/deviceTokenController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { deviceTokenSchema } = require('../validators/deviceTokenValidators');
const logger = require('../utils/logger');

const router = express.Router();

// Test route that doesn't require authentication
router.get('/test', (req, res) => {
  logger.info('Device token test route hit');
  res.status(200).json({
    status: 'success',
    message: 'Device token route is working!'
  });
});

// Test route with no auth and no database access
router.post('/test-no-db', (req, res) => {
  logger.info('Device token test-no-db route hit with body:', req.body);
  res.status(201).json({
    status: 'success',
    message: 'Test route (no DB) working!',
    receivedData: req.body
  });
});

// Verify token endpoint - no authentication required (for IoT devices)
router.get('/verify', deviceTokenController.verifyToken);

// Get tokens for a specific sensor - requires authentication
router.get('/sensor/:sensorId', authenticate, deviceTokenController.getTokensBySensor);

// Device token routes - require authentication for management
router.post('/', authenticate, deviceTokenController.createToken);

// Revoke or delete a token - requires authentication
router.route('/:id')
  .get(authenticate, deviceTokenController.getTokenById)
  .patch(authenticate, deviceTokenController.revokeToken)
  .delete(authenticate, deviceTokenController.deleteToken);

module.exports = router; 