const roleService = require('../services/roleService');
const permissionService = require('../services/permissionService');
const { ApiError } = require('../middlewares/errorHandler');
const { Role } = require('../models/initModels');

/**
 * Get all roles
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const getAllRoles = async (req, res, next) => {
  try {
    // Add debug log
    console.log('Getting all roles');
    
    // Get roles with safer include option
    const includeOptions = {};
    // Check if the Permissions association exists on the Role model
    const includePermissions = Role.associations && Role.associations.Permissions;
    
    if (includePermissions) {
      includeOptions.include = [{ association: 'Permissions' }];
    }
    
    const roles = await roleService.getAllRoles(includeOptions);
    
    // Log success
    console.log(`Retrieved ${roles.length} roles`);
    
    res.status(200).json({ 
      status: 'success', 
      data: roles 
    });
  } catch (error) {
    // Enhanced error logging
    console.error('Error in getAllRoles:', error.message);
    console.error(error.stack);
    next(error);
  }
};

/**
 * Get a role by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const getRoleById = async (req, res, next) => {
  try {
    const roleId = req.params.id;
    
    const role = await roleService.getRoleById(roleId, {
      include: [{ association: 'Permissions' }]
    });
    
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }
    
    res.status(200).json({ 
      status: 'success', 
      data: role 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get roles for an organization
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const getOrganizationRoles = async (req, res, next) => {
  try {
    const organizationId = req.params.organizationId;
    
    const roles = await roleService.getRolesByOrganizationId(organizationId);
    
    res.status(200).json({ 
      status: 'success', 
      data: roles 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new role
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const createRole = async (req, res, next) => {
  try {
    const { name, organizationId } = req.body;
    
    const role = await roleService.createRole({ name, organizationId });
    
    res.status(201).json({ 
      status: 'success', 
      data: role,
      message: 'Role created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a role
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const updateRole = async (req, res, next) => {
  try {
    const roleId = req.params.id;
    const { name } = req.body;
    
    const role = await roleService.updateRole(roleId, { name });
    
    res.status(200).json({ 
      status: 'success', 
      data: role,
      message: 'Role updated successfully' 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a role
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const deleteRole = async (req, res, next) => {
  try {
    const roleId = req.params.id;
    
    await roleService.deleteRole(roleId);
    
    res.status(200).json({ 
      status: 'success', 
      message: 'Role deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get permissions for a role
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const getRolePermissions = async (req, res, next) => {
  try {
    const roleId = req.params.id;
    
    const permissions = await permissionService.getPermissionsByRoleId(roleId);
    
    res.status(200).json({ 
      status: 'success', 
      data: permissions 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add permission to a role
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const addPermissionToRole = async (req, res, next) => {
  try {
    const roleId = req.params.id;
    const { permissionId } = req.body;
    
    const result = await permissionService.addPermissionToRole(roleId, permissionId);
    
    res.status(201).json({ 
      status: 'success', 
      data: result,
      message: 'Permission added to role successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove permission from a role
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const removePermissionFromRole = async (req, res, next) => {
  try {
    const roleId = req.params.id;
    const permissionId = req.params.permissionId;
    
    await permissionService.removePermissionFromRole(roleId, permissionId);
    
    res.status(200).json({ 
      status: 'success', 
      message: 'Permission removed from role successfully' 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  getOrganizationRoles,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  addPermissionToRole,
  removePermissionFromRole
}; 