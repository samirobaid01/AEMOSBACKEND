const express = require('express');
const deviceController = require('../controllers/deviceController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
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
  .get( deviceController.getAllDevices)
  .post(authenticate, validate(deviceSchema.create), deviceController.createDevice);

router
  .route('/:id')
  .get(authenticate, deviceController.getDeviceById)
  .patch(authenticate, validate(deviceSchema.update), deviceController.updateDevice)
  .delete(authenticate, deviceController.deleteDevice);

module.exports = router; 