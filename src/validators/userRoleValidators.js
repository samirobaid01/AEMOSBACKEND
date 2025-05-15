const Joi = require('joi');

const getUserRolesValidator = Joi.object({
  userId: Joi.number().required().messages({
    'number.base': 'User ID must be a number',
    'any.required': 'User ID is required'
  })
});

const assignRoleToUserValidator = Joi.object({
  userId: Joi.number().required().messages({
    'number.base': 'User ID must be a number',
    'any.required': 'User ID is required'
  }),
  roleId: Joi.number().required().messages({
    'number.base': 'Role ID must be a number',
    'any.required': 'Role ID is required'
  }),
  organizationId: Joi.number().required().messages({
    'number.base': 'Organization ID must be a number',
    'any.required': 'Organization ID is required'
  })
});

const removeUserRoleValidator = Joi.object({
  userId: Joi.number().required().messages({
    'number.base': 'User ID must be a number',
    'any.required': 'User ID is required'
  }),
  organizationId: Joi.number().required().messages({
    'number.base': 'Organization ID must be a number',
    'any.required': 'Organization ID is required'
  })
});

module.exports = {
  getUserRolesValidator,
  assignRoleToUserValidator,
  removeUserRoleValidator
}; 