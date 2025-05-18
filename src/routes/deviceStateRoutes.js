const express = require('express');
const router = express.Router();
const deviceStateController = require('../controllers/deviceStateController');
const auth = require('../middlewares/auth');
const permission = require('../middlewares/permission');
const validate = require('../middlewares/validate');
const deviceStateValidator = require('../validators/deviceStateValidator');

// Public routes
// None

// Protected routes
router.use(auth.authenticate);

// Get all state types
router.get(
  '/types',
  auth.authorize('user', 'admin'),
  deviceStateController.getAllStateTypes
);

// Create a new state type (admin only)
router.post(
  '/types',
  auth.authorize('admin'),
  validate(deviceStateValidator.createStateType),
  deviceStateController.createStateType
);

// Get current state for a device
router.get(
  '/devices/:deviceId/current',
  auth.authorize('user', 'admin'),
  permission.checkResourceOwnership(require('../services/deviceService').getDeviceForOwnershipCheck),
  deviceStateController.getCurrentDeviceState
);

// Get device state history
router.get(
  '/devices/:deviceId/history',
  auth.authorize('user', 'admin'),
  permission.checkResourceOwnership(require('../services/deviceService').getDeviceForOwnershipCheck),
  deviceStateController.getDeviceStateHistory
);

// Create a new state for a device
router.post(
  '/devices/:deviceId',
  auth.authorize('user', 'admin'),
  validate(deviceStateValidator.createDeviceState),
  permission.checkResourceOwnership(require('../services/deviceService').getDeviceForOwnershipCheck),
  deviceStateController.createDeviceState
);

// Create a state transition rule (admin only)
router.post(
  '/transitions',
  auth.authorize('admin'),
  validate(deviceStateValidator.createStateTransition),
  deviceStateController.createStateTransition
);

module.exports = router; 