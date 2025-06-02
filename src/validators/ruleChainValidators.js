const Joi = require('joi');

const createRuleChainSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().allow(null),
  organizationId: Joi.number().integer().required()
});

const updateRuleChainSchema = Joi.object({
  name: Joi.string().max(100),
  description: Joi.string().allow(null)
});

const createRuleChainNodeSchema = Joi.object({
  ruleChainId: Joi.number().integer().required(),
  type: Joi.string().valid('filter', 'transform', 'action').required(),
  config: Joi.string().allow(null),
  nextNodeId: Joi.number().integer().allow(null)
});

const updateRuleChainNodeSchema = Joi.object({
  type: Joi.string().valid('filter', 'transform', 'action'),
  config: Joi.string().allow(null),
  nextNodeId: Joi.number().integer().allow(null)
});

const querySchema = Joi.object({
  organizationId: Joi.number().integer().required()
});

module.exports = {
  createRuleChainSchema,
  updateRuleChainSchema,
  createRuleChainNodeSchema,
  updateRuleChainNodeSchema,
  querySchema
}; 