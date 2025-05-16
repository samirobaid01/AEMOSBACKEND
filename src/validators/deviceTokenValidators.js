const Joi = require('joi');

const deviceTokenSchema = {
  // Schema for token creation
  create: Joi.object({
    sensorId: Joi.number().integer().positive().required(),
    expiresAt: Joi.date().iso().allow(null).greater('now').optional()
  }),
  
  // Schema for querying tokens
  query: Joi.object({
    sensorId: Joi.number().integer().positive().required()
  })
};

module.exports = {
  deviceTokenSchema
}; 