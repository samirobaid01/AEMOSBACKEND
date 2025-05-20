const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/permission');
const validate = require('../middlewares/validate');
const deviceStateValidator = require('../validators/deviceStateValidator');
const deviceStateController = require('../controllers/deviceStateController');
const logger = require('../utils/logger');

// Public test route
router.get('/test', (req, res) => {
  logger.info('Device state test route hit');
  res.status(200).json({
    status: 'success',
    message: 'Device state route is working!'
  });
});

// Protected routes
router.use(authenticate);

// Get all states for a device
router.get(
  '/device/:deviceId',
  checkPermission('device.view'),
  deviceStateController.getAllDeviceStates
);

// Get specific state
router.get(
  '/:id',
  checkPermission('device.view'),
  deviceStateController.getDeviceStateById
);

// Create new state for a device
router.post(
  '/device/:deviceId',
  authenticate,
  validate(deviceStateValidator.createDeviceState),
  checkPermission('device.update'),
  deviceStateController.createDeviceState
);

// Update state
router.patch(
  '/:id',
  checkPermission('device.update'),
  validate(deviceStateValidator.updateDeviceState),
  deviceStateController.updateDeviceState
);

// Delete state
router.delete(
  '/:id',
  checkPermission('device.update'),
  deviceStateController.deleteDeviceState
);

module.exports = router; 