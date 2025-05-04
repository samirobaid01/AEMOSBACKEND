const Joi = require('joi');

// Area validation schemas
const areaSchema = {
  create: Joi.object({
    name: Joi.string().max(50).required(),
    organizationId: Joi.number().integer().required(),
    parentArea: Joi.number().integer().allow(null),
    image: Joi.string().allow('', null),
    uuid: Joi.string().uuid().allow('', null)
  }),
  update: Joi.object({
    name: Joi.string().max(50),
    organizationId: Joi.number().integer(),
    parentArea: Joi.number().integer().allow(null),
    image: Joi.string().allow('', null),
    uuid: Joi.string().uuid().allow('', null)
  })
};

module.exports = areaSchema; 