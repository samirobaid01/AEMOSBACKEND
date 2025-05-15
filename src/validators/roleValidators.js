const Joi = require('joi');

const createRoleSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    'string.base': 'Role name must be a string',
    'string.min': 'Role name must be at least 3 characters long',
    'string.max': 'Role name must not exceed 50 characters',
    'any.required': 'Role name is required'
  }),
  organizationId: Joi.number().optional().messages({
    'number.base': 'Organization ID must be a number'
  })
});

const updateRoleSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    'string.base': 'Role name must be a string',
    'string.min': 'Role name must be at least 3 characters long',
    'string.max': 'Role name must not exceed 50 characters',
    'any.required': 'Role name is required'
  })
});

const createRoleValidator = createRoleSchema;
const updateRoleValidator = updateRoleSchema;

const deleteRoleValidator = Joi.object({
  id: Joi.number().required().messages({
    'number.base': 'Role ID must be a number',
    'any.required': 'Role ID is required'
  })
});

const getRoleByIdValidator = Joi.object({
  id: Joi.number().required().messages({
    'number.base': 'Role ID must be a number',
    'any.required': 'Role ID is required'
  })
});

const getOrganizationRolesValidator = Joi.object({
  organizationId: Joi.number().required().messages({
    'number.base': 'Organization ID must be a number',
    'any.required': 'Organization ID is required'
  })
});

const addPermissionToRoleValidator = Joi.object({
  id: Joi.number().required().messages({
    'number.base': 'Role ID must be a number',
    'any.required': 'Role ID is required'
  }),
  permissionId: Joi.number().required().messages({
    'number.base': 'Permission ID must be a number',
    'any.required': 'Permission ID is required'
  })
});

const removePermissionFromRoleValidator = Joi.object({
  id: Joi.number().required().messages({
    'number.base': 'Role ID must be a number',
    'any.required': 'Role ID is required'
  }),
  permissionId: Joi.number().required().messages({
    'number.base': 'Permission ID must be a number',
    'any.required': 'Permission ID is required'
  })
});

module.exports = {
  createRoleValidator,
  updateRoleValidator,
  deleteRoleValidator,
  getRoleByIdValidator,
  getOrganizationRolesValidator,
  addPermissionToRoleValidator,
  removePermissionFromRoleValidator
}; 