const Joi = require('joi');

// Sensor validation schemas
const allowedStatuses = ['active', 'inactive', 'pending', 'calibrating', 'error', 'disconnected', 'retired'];

const sensorSchema = {
  create: Joi.object({
    name: Joi.string().max(50).required(),
    description: Joi.string().allow('', null),
    status: Joi.string().valid(...allowedStatuses).default('pending'),
    uuid: Joi.string().uuid().allow('', null),
    organizationId: Joi.number().integer().required()
  }),
  update: Joi.object({
    name: Joi.string().max(50),
    description: Joi.string().allow('', null),
    status: Joi.string().valid(...allowedStatuses).default('pending'),
    uuid: Joi.string().uuid().allow('', null),
    organizationId: Joi.number().integer().required()
  }),
  query: Joi.object({
    organizationId: Joi.number().integer().required()
  })
};

// TelemetryData validation schemas
const telemetryDataSchema = {
  create: Joi.object({
    variableName: Joi.string().max(50).required(),
    datatype: Joi.string().max(50).required(),
    sensorId: Joi.number().integer().required()
  }),
  update: Joi.object({
    variableName: Joi.string().max(50),
    datatype: Joi.string().max(50),
    sensorId: Joi.number().integer()
  })
};

module.exports = {
  sensorSchema,
  telemetryDataSchema
}; 