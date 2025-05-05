const Joi = require('joi');

// Sensor validation schemas
const sensorSchema = {
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