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
  body: Joi.object({
    stateTypeId: Joi.number().integer().required(),
    stateValue: Joi.string().max(100).required(),
    isCurrent: Joi.boolean().default(true),
    triggeredBySensor: Joi.number().integer().allow(null),
    triggeredByRule: Joi.number().integer().allow(null),
    expiresAt: Joi.date().allow(null)
  }),
  params: Joi.object({
    deviceId: Joi.number().integer().required()
  }),
  query: Joi.object({
    organizationId: Joi.number().integer().required()
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

module.exports = {
  createStateType,
  createDeviceState,
  createStateTransition
}; 