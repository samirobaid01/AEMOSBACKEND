const Joi = require('joi');

// Validator for creating a new state type
const createStateType = {
  body: Joi.object({
    name: Joi.string().max(50).required(),
    description: Joi.string().allow('', null),
    valueType: Joi.string().valid('boolean', 'number', 'string', 'percentage').required(),
    deviceType: Joi.string().valid('actuator', 'controller', 'gateway', 'sensor_hub', 'hybrid').allow(null)
  })
};

// Validator for creating a new device state
const createDeviceState = {
  params: Joi.object({
    deviceId: Joi.number().required()
  }),
  body: Joi.object({
    stateName: Joi.string().max(50).required(),
    dataType: Joi.string().max(50).default('string'),
    defaultValue: Joi.string().max(100).allow(null),
    allowedValues: Joi.array().items(Joi.string().max(100)).allow(null)
  })
};

// Validator for creating a state transition rule
const createStateTransition = {
  body: Joi.object({
    deviceType: Joi.string().valid('actuator', 'controller', 'gateway', 'sensor_hub', 'hybrid').required(),
    fromStateId: Joi.number().integer().required(),
    toStateId: Joi.number().integer().required(),
    isAllowed: Joi.boolean().default(true),
    minimumDelaySeconds: Joi.number().integer().min(0).default(0)
  })
};

const updateDeviceState = {
  params: Joi.object({
    id: Joi.number().required()
  }),
  body: Joi.object({
    stateName: Joi.string().max(50),
    dataType: Joi.string().max(50),
    defaultValue: Joi.string().max(100).allow(null),
    allowedValues: Joi.array().items(Joi.string().max(100)).allow(null)
  })
};

module.exports = {
  createStateType,
  createDeviceState,
  createStateTransition,
  updateDeviceState
}; 