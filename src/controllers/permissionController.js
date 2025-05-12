const permissionService = require('../services/permissionService');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * Get all permissions
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await permissionService.getAllPermissions();
    
    res.status(200).json({ 
      status: 'success', 
      data: permissions 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a user's effective permissions
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const getUserPermissions = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const organizationId = req.query.organizationId || null;
    
    const permissions = await permissionService.getUserEffectivePermissions(userId, organizationId);
    
    res.status(200).json({ 
      status: 'success', 
      data: permissions 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if a user has a specific permission
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const checkUserPermission = async (req, res, next) => {
  try {
    const { userId, permissionName, organizationId } = req.query;
    
    if (!userId || !permissionName) {
      throw new ApiError(400, 'User ID and permission name are required');
    }
    
    const hasPermission = await permissionService.userHasPermission(
      userId, 
      permissionName, 
      organizationId || null
    );
    
    res.status(200).json({ 
      status: 'success', 
      data: { hasPermission } 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check current user's permission (based on authentication)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const checkMyPermission = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const { permissionName, organizationId } = req.query;
    
    if (!permissionName) {
      throw new ApiError(400, 'Permission name is required');
    }
    
    const hasPermission = await permissionService.userHasPermission(
      req.user.id, 
      permissionName, 
      organizationId || null
    );
    
    res.status(200).json({ 
      status: 'success', 
      data: { hasPermission } 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPermissions,
  getUserPermissions,
  checkUserPermission,
  checkMyPermission
}; 