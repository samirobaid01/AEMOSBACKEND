const Joi = require('joi');

// Area validation schemas
const areaSchema = {
  create: Joi.object({
    name: Joi.string().max(50).required(),
    organizationId: Joi.number().integer().required(),
    parentArea: Joi.number().integer().allow(null),
    image: Joi.string().allow('', null),
    uuid: Joi.string().uuid().allow('', null),
    status: Joi.string().valid('active', 'inactive', 'under_review', 'archived').default('under_review'),
    description: Joi.string().allow('', null)
  }),
  update: Joi.object({
    name: Joi.string().max(50),
    organizationId: Joi.number().integer().required(),
    parentArea: Joi.number().integer().allow(null),
    image: Joi.string().allow('', null),
    uuid: Joi.string().uuid().allow('', null),
    status: Joi.string().valid('active', 'inactive', 'under_review', 'archived').allow('', null),
    description: Joi.string().allow('', null)
  }),
  query: Joi.object({
    organizationId: Joi.number().integer().required()
  })
};

module.exports = areaSchema; 