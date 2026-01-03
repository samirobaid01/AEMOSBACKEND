const Joi = require('joi');

// DataStream item schema (reusable)
const dataStreamItemSchema = Joi.object({
  value: Joi.string().max(50).required(),
  variableName: Joi.string().max(50).required(),
  recievedAt: Joi.date().allow(null),
  urgent: Joi.boolean(),
  thresholds: Joi.object({
    min: Joi.number(),
    max: Joi.number()
  }).optional()
});

// DataStream validation schemas
const dataStreamSchema = {
  create: dataStreamItemSchema,
  update: Joi.object({
    value: Joi.string().max(50),
    telemetryDataId: Joi.number().integer(),
    recievedAt: Joi.date().allow(null),
    urgent: Joi.boolean(),
    thresholds: Joi.object({
      min: Joi.number(),
      max: Joi.number()
    }).optional()
  }),
  createBatch: Joi.object({
    dataStreams: Joi.array().items(dataStreamItemSchema).min(1).max(1000).required()
  })
};

module.exports = {
  dataStreamSchema
}; 