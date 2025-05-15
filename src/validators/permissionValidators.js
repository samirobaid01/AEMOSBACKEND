const Joi = require('joi');

const getUserPermissionsValidator = Joi.object({
  userId: Joi.number().required().messages({
    'number.base': 'User ID must be a number',
    'any.required': 'User ID is required'
  }),
  organizationId: Joi.number().optional().messages({
    'number.base': 'Organization ID must be a number'
  })
});

const checkUserPermissionValidator = Joi.object({
  userId: Joi.number().required().messages({
    'number.base': 'User ID must be a number',
    'any.required': 'User ID is required'
  }),
  permissionName: Joi.string().required().messages({
    'string.base': 'Permission name must be a string',
    'any.required': 'Permission name is required'
  }),
  organizationId: Joi.number().optional().messages({
    'number.base': 'Organization ID must be a number'
  })
});

const checkMyPermissionValidator = Joi.object({
  permissionName: Joi.string().required().messages({
    'string.base': 'Permission name must be a string',
    'any.required': 'Permission name is required'
  }),
  organizationId: Joi.number().optional().messages({
    'number.base': 'Organization ID must be a number'
  })
});

module.exports = {
  getUserPermissionsValidator,
  checkUserPermissionValidator,
  checkMyPermissionValidator
}; 