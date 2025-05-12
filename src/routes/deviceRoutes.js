const express = require('express');
const deviceController = require('../controllers/deviceController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { checkPermission, checkResourceOwnership } = require('../middlewares/permission');
const { getDeviceForOwnershipCheck } = require('../services/deviceService');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const deviceSchema = {
  create: Joi.object({
    name: Joi.string().max(50).required(),
    description: Joi.string().allow('', null),
    status: Joi.boolean().default(true),
    uuid: Joi.string().uuid().allow('', null)
  }),
  update: Joi.object({
    name: Joi.string().max(50),
    description: Joi.string().allow('', null),
    status: Joi.boolean(),
    uuid: Joi.string().uuid().allow('', null)
  })
};

// Routes
router
  .route('/')
  .get(authenticate, checkPermission('device.view'), deviceController.getAllDevices)
  .post(
    authenticate, 
    validate(deviceSchema.create), 
    checkPermission('device.create'),
    deviceController.createDevice
  );

// Test endpoint to check if our changes are being reloaded
router.get('/test', (req, res) => {
  console.log('Test endpoint hit!');
  res.status(200).json({
    status: 'success',
    message: 'Test endpoint is working!'
  });
});

router
  .route('/:id')
  .get(
    authenticate, 
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
    checkPermission('device.delete'),
    checkResourceOwnership(getDeviceForOwnershipCheck),
    deviceController.deleteDevice
  );

module.exports = router; 