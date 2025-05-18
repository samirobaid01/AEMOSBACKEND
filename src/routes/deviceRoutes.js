const express = require('express');
const deviceController = require('../controllers/deviceController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission, checkResourceOwnership } = require('../middlewares/permission');
const { getDeviceForOwnershipCheck } = require('../services/deviceService');
const { deviceSchema } = require('../validators/deviceValidator');

const router = express.Router();

// Add non-authenticated routes first
// Test endpoint to check if our changes are being reloaded
router.get('/test', (req, res) => {
  console.log('Test endpoint hit!');
  res.status(200).json({
    status: 'success',
    message: 'Test endpoint is working!'
  });
});

// Device token test endpoint - no authentication
router.get('/token-test', (req, res) => {
  console.log('Device token test endpoint hit!');
  res.status(200).json({
    status: 'success',
    message: 'Device token test endpoint is working through deviceRoutes!'
  });
});

// Routes that require authentication
router
  .route('/')
  .get(
    authenticate, 
    validate(deviceSchema.query, { query: true }),
    checkPermission('device.view'),
    deviceController.getAllDevices
  )
  .post(
    authenticate, 
    validate(deviceSchema.create), 
    checkPermission('device.create'),
    deviceController.createDevice
  );

// Route to create a device token (simplified)
router.post('/token', authenticate, async (req, res) => {
  try {
    const { sensorId } = req.body;
    
    if (!sensorId) {
      return res.status(400).json({
        status: 'error',
        message: 'sensorId is required'
      });
    }
    
    // Simple token generation
    const token = require('crypto').randomBytes(32).toString('hex');
    
    res.status(201).json({
      status: 'success',
      data: {
        token,
        sensorId
      }
    });
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create token'
    });
  }
});

router
  .route('/:id')
  .get(
    authenticate, 
    validate(deviceSchema.query, { query: true }),
    checkPermission('device.view'),
    checkResourceOwnership(getDeviceForOwnershipCheck),
    deviceController.getDeviceById
  )
  .patch(
    authenticate, 
    validate(deviceSchema.update), 
    checkPermission('device.update'),
    checkResourceOwnership(getDeviceForOwnershipCheck),
    deviceController.updateDevice
  )
  .delete(
    authenticate, 
    validate(deviceSchema.query, { query: true }),
    checkPermission('device.delete'),
    checkResourceOwnership(getDeviceForOwnershipCheck),
    deviceController.deleteDevice
  );

module.exports = router; 