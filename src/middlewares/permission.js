const { ApiError } = require('./errorHandler');
const { userHasPermission } = require('../services/permissionService');

/**
 * Middleware to check if user has required permissions
 * @param {String|Array} requiredPermissions - Permission name(s) to check
 * @param {Boolean} requireAll - If true, user must have all permissions; if false, any one is sufficient
 */
const checkPermission = (requiredPermissions, requireAll = true) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }
      
      const userId = req.user.id;
      const organizationId = req.params.organizationId || req.body.organizationId || null;
      
      // Handle single permission or array of permissions
      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];
      
      // Check each permission
      const permissionChecks = await Promise.all(
        permissions.map(permission => 
          userHasPermission(userId, permission, organizationId)
        )
      );
      
      // Determine if user has required permissions
      const hasPermission = requireAll
        ? permissionChecks.every(Boolean) // All permissions required
        : permissionChecks.some(Boolean); // Any permission sufficient
      
      if (!hasPermission) {
        throw new ApiError(403, 'Forbidden: Insufficient permissions');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has organization-specific permissions
 * @param {String|Array} requiredPermissions - Permission name(s) to check
 * @param {Boolean} requireAll - If true, user must have all permissions; if false, any one is sufficient
 * @param {String} orgIdParam - The parameter name containing the organization ID (default: 'organizationId')
 */
const checkOrgPermission = (requiredPermissions, requireAll = true, orgIdParam = 'organizationId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }
      
      // Get organization ID from URL or body
      const organizationId = req.params[orgIdParam] || req.body[orgIdParam];
      
      if (!organizationId) {
        throw new ApiError(400, 'Organization ID is required');
      }
      
      const userId = req.user.id;
      
      // Handle single permission or array of permissions
      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];
      
      // Check each permission in the context of the organization
      const permissionChecks = await Promise.all(
        permissions.map(permission => 
          userHasPermission(userId, permission, organizationId)
        )
      );
      
      // Determine if user has required permissions
      const hasPermission = requireAll
        ? permissionChecks.every(Boolean) // All permissions required
        : permissionChecks.some(Boolean); // Any permission sufficient
      
      if (!hasPermission) {
        throw new ApiError(403, 'Forbidden: Insufficient permissions for this organization');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  checkPermission,
  checkOrgPermission
}; 