const Joi = require('joi');

const createRuleChainSchema = Joi.object({
  // Basic rule chain fields
  name: Joi.string().max(100).required(),
  description: Joi.string().allow(null),
  organizationId: Joi.number().integer().required(),
  
  // Scheduling fields (optional)
  scheduleEnabled: Joi.boolean().default(false),
  cronExpression: Joi.string().max(100).when('scheduleEnabled', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional().allow(null)
  }),
  timezone: Joi.string().max(50).default('UTC'),
  priority: Joi.number().integer().min(0).max(100).default(0),
  maxRetries: Joi.number().integer().min(0).max(10).default(0),
  retryDelay: Joi.number().integer().min(0).max(60000).default(0), // Max 60 seconds
  scheduleMetadata: Joi.object().allow(null).default(null)
});

const updateRuleChainSchema = Joi.object({
  name: Joi.string().max(100),
  description: Joi.string().allow(null)
});

const createRuleChainNodeSchema = Joi.object({
  name: Joi.string().max(100).required(),
  ruleChainId: Joi.number().integer().required(),
  type: Joi.string().valid('filter', 'transform', 'action').required(),
  config: Joi.string().allow(null),
  nextNodeId: Joi.number().integer().allow(null)
});

const updateRuleChainNodeSchema = Joi.object({
  name: Joi.string().max(100),
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