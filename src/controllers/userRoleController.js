const roleService = require('../services/roleService');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * Get roles for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const getUserRoles = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    
    const roles = await roleService.getUserRoles(userId);
    
    res.status(200).json({ 
      status: 'success', 
      data: roles 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign a role to a user for an organization
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const assignRoleToUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { roleId, organizationId } = req.body;
    
    if (!roleId || !organizationId) {
      throw new ApiError(400, 'Role ID and organization ID are required');
    }
    
    const result = await roleService.assignRoleToUser(userId, roleId, organizationId);
    
    res.status(200).json({ 
      status: 'success', 
      data: result,
      message: 'Role assigned successfully' 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a user's role for an organization
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const removeUserRole = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const organizationId = req.params.organizationId;
    
    await roleService.removeUserRole(userId, organizationId);
    
    res.status(200).json({ 
      status: 'success', 
      message: 'Role removed successfully' 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's roles (based on authentication)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const getMyRoles = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const roles = await roleService.getUserRoles(req.user.id);
    
    res.status(200).json({ 
      status: 'success', 
      data: roles 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserRoles,
  assignRoleToUser,
  removeUserRole,
  getMyRoles
}; 