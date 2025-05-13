const Joi = require('joi');

// Organization validation schemas
const organizationSchema = {
  create: Joi.object({
    parentId: Joi.number().integer().allow(null),
    name: Joi.string().max(50).required(),
    status: Joi.string().valid('active', 'inactive', 'pending', 'suspended', 'archived').default('pending'),
    detail: Joi.string().allow('', null),
    paymentMethods: Joi.string().allow('', null),
    image: Joi.string().allow('', null),
    address: Joi.string().allow('', null),
    zip: Joi.string().max(50).allow('', null),
    email: Joi.string().email().allow('', null),
    isParent: Joi.boolean().default(false),
    contactNumber: Joi.string().max(50).allow('', null)
  }),
  update: Joi.object({
    organizationId: Joi.number().integer().required(),
    parentId: Joi.number().integer().allow(null),
    name: Joi.string().max(50),
    status: Joi.string().valid('active', 'inactive', 'pending', 'suspended', 'archived'),
    detail: Joi.string().allow('', null),
    paymentMethods: Joi.string().allow('', null),
    image: Joi.string().allow('', null),
    address: Joi.string().allow('', null),
    zip: Joi.string().max(50).allow('', null),
    email: Joi.string().email().allow('', null),
    isParent: Joi.boolean(),
    contactNumber: Joi.string().max(50).allow('', null)
  }),
  query: Joi.object({
    organizationId: Joi.number().integer().required()
  })
};

module.exports = organizationSchema; 