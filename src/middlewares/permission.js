const { ApiError } = require('./errorHandler');
const { userHasPermission } = require('../services/permissionService');
const { userIsSystemAdmin, getUserOrganizations } = require('../services/roleService');
const { sequelize } = require('../config/database');

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

/**
 * Middleware to check if a resource belongs to user's organization
 * @param {Function} resourceFetcher - Function to fetch the resource and verify organization ownership
 * @param {String} idParam - The parameter name containing the resource ID (default: 'id')
 */
const checkResourceOwnership = (resourceFetcher, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      // Get organization ID from request
      const organizationId = req.body.organizationId || req.query.organizationId;
      if (!organizationId) {
        throw new ApiError(400, 'Organization ID is required');
      }

      const resourceId = req.params[idParam];
      if (!resourceId) {
        throw new ApiError(400, `Resource ID (${idParam}) is required`);
      }

      console.log(`Checking ownership for resource ${idParam}=${resourceId} in organization ${organizationId} by user ${req.user.id}`);

      // Check if user is a System Admin - they can access all resources
      try {
        const isSystemAdmin = await userIsSystemAdmin(req.user.id);
        console.log(`User is System Admin: ${isSystemAdmin}`);
        
        if (isSystemAdmin) {
          console.log('System Admin bypass - allowing access to resource');
          return next();
        }
      } catch (error) {
        console.error('Error checking if user is System Admin:', error.message);
        // Continue with normal user flow
      }

      // Check if user belongs to the specified organization
      let userOrgs = [];
      let userBelongsToOrg = false;
      
      try {
        console.log(`Checking if user ${req.user.id} belongs to organization ${organizationId}`);
        userOrgs = await getUserOrganizations(req.user.id);
        console.log(`User organizations:`, userOrgs.map(org => org.id));
        
        userBelongsToOrg = userOrgs.some(org => org.id === Number(organizationId));
        console.log(`User belongs to organization ${organizationId}: ${userBelongsToOrg}`);
      } catch (error) {
        console.error('Error getting user organizations:', error.message);
        // Check if this is a Sequelize association error
        if (error.name === 'SequelizeEagerLoadingError') {
          console.error('Using alternate method to check user organization access');
          // Fallback to direct SQL query
          try {
            const query = `
              SELECT COUNT(*) as count
              FROM OrganizationUser
              WHERE userId = :userId AND organizationId = :organizationId
            `;
            
            const [result] = await sequelize.query(query, {
              replacements: { 
                userId: req.user.id,
                organizationId: Number(organizationId)
              },
              type: sequelize.QueryTypes.SELECT
            });
            
            userBelongsToOrg = result.count > 0;
            console.log(`User ${req.user.id} belongs to organization ${organizationId}: ${userBelongsToOrg} (verified by fallback method)`);
          } catch (fallbackError) {
            console.error('Error in fallback organization check:', fallbackError);
            throw new ApiError(500, 'Error verifying user organization access');
          }
        } else {
          throw new ApiError(500, 'Error verifying user organizations');
        }
      }

      if (!userBelongsToOrg) {
        console.log(`Access denied: user ${req.user.id} does not belong to organization ${organizationId}`);
        throw new ApiError(403, 'Forbidden: You do not have access to this organization');
      }

      // Get resource and verify it belongs to the organization
      let resource = null;
      try {
        console.log(`Fetching resource ${idParam}=${resourceId} to verify organization ownership`);
        resource = await resourceFetcher(resourceId);
      } catch (error) {
        console.error(`Error fetching resource:`, error.message);
        throw new ApiError(500, 'Error fetching resource data');
      }
      
      if (!resource) {
        console.log(`Resource ${idParam}=${resourceId} not found`);
        throw new ApiError(404, 'Resource not found');
      }

      // Verify resource belongs to the specified organization
      console.log(`Checking if resource ${idParam}=${resourceId} belongs to organization ${organizationId}`);
      console.log(`Resource organization ID:`, resource.organizationId);
      
      if (resource.organizationId === null) {
        console.warn(`WARNING: Resource ${idParam}=${resourceId} has no organizationId. Additional check required.`);
        // For resources without direct organizationId, we've already verified the user's access
        // through the previous userBelongsToOrg check. The resourceFetcher should have verified
        // the resource's organization through relationships (like Device->Area->Organization)
        req.resourceOrganizationId = organizationId;
        return next();
      }
      
      // Verify resource's organization matches the requested organization
      if (resource.organizationId !== Number(organizationId)) {
        console.log(`Organization mismatch: Resource belongs to ${resource.organizationId}, but user is accessing via ${organizationId}`);
        throw new ApiError(403, 'Forbidden: Resource does not belong to the specified organization');
      }

      // Store the organization ID for later use
      req.resourceOrganizationId = Number(organizationId);
      
      console.log(`Access granted to resource ${idParam}=${resourceId} for user ${req.user.id}`);
      next();
    } catch (error) {
      console.error('Error in checkResourceOwnership:', error);
      next(error);
    }
  };
};

module.exports = {
  checkPermission,
  checkOrgPermission,
  checkResourceOwnership
}; 