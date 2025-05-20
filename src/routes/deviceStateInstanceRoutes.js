const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/permission');
const validate = require('../middlewares/validate');
const deviceStateInstanceValidator = require('../validators/deviceStateInstanceValidator');
const deviceStateInstanceController = require('../controllers/deviceStateInstanceController');

// Create new state instance
router.post(
  '/',
  authenticate,
  checkPermission('device.update'),
  validate(deviceStateInstanceValidator.createStateInstance),
  deviceStateInstanceController.createStateInstance
);

// Get current state instance for a device state
router.get(
  '/current/:deviceStateId',
  authenticate,
  checkPermission('device.view'),
  deviceStateInstanceController.getCurrentInstance
);

// Get state instance history for a device state
router.get(
  '/history/:deviceStateId',
  authenticate,
  checkPermission('device.view'),
  deviceStateInstanceController.getInstanceHistory
);

module.exports = router; 