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
      if (String(resourceId).startsWith(':')) {
        throw new ApiError(400, `Invalid resource ID: URL appears to contain the placeholder "${resourceId}" instead of the actual ID. Replace it with the real resource ID (e.g. numeric or UUID).`);
      }

      console.log(`Checking ownership for resource id=${resourceId} in organization ${organizationId} by user ${req.user.id}`);

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
        console.log(`User organizations: ${userOrgs.map(org => org.id)}`);
        
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
      let resourceBelongsToOrg = false;
      
      try {
        console.log(`Fetching resource id=${resourceId} to verify organization ownership`);
        resource = await resourceFetcher(resourceId);
        
        if (!resource) {
          console.log(`Resource id=${resourceId} not found`);
          throw new ApiError(404, 'Resource not found');
        }
        
        console.log(`Checking if resource id=${resourceId} belongs to organization ${organizationId}`);
        console.log(`Resource organization ID: ${resource.organizationId}`);
        
        // For resources with null organizationId (like Sensors that access organization via Area)
        // We need to verify the relationship using specialized logic
        if (resource.organizationId === null) {
          console.warn(`WARNING: Resource id=${resourceId} has no organizationId. Additional check required.`);
          
          // Check if the resource fetcher has a specialized resourceBelongsToOrganization function
          if (resourceFetcher.resourceBelongsToOrganization) {
            try {
              resourceBelongsToOrg = await resourceFetcher.resourceBelongsToOrganization(resourceId, organizationId);
              console.log(`Resource ${resourceId} belongs to organization ${organizationId}: ${resourceBelongsToOrg}`);
              
              if (!resourceBelongsToOrg) {
                console.log(`Cross-organization access denied: Resource id=${resourceId} does not belong to organization ${organizationId}`);
                throw new ApiError(403, 'Forbidden: Resource does not belong to the specified organization');
              }
              
              // Set the organization ID for later use
              req.resourceOrganizationId = Number(organizationId);
              console.log(`Access granted: Resource ${resourceId} confirmed to belong to organization ${organizationId}`);
              return next();
            } catch (error) {
              console.error(`Error in specialized ownership check: ${error.message}`);
              throw new ApiError(403, 'Forbidden: Cannot verify resource organization ownership');
            }
          }
        } else {
          // If the resource has a direct organizationId, simply compare it
          if (resource.organizationId !== Number(organizationId)) {
            console.log(`Organization mismatch: Resource belongs to ${resource.organizationId}, but user is accessing via ${organizationId}`);
            throw new ApiError(403, 'Forbidden: Resource does not belong to the specified organization');
          }
        }
      } catch (error) {
        if (error instanceof ApiError) {
          throw error; // Re-throw ApiErrors that we created
        }
        console.error(`Error verifying resource ownership:`, error.message);
        throw new ApiError(500, 'Error verifying resource ownership');
      }

      // Store the organization ID for later use
      req.resourceOrganizationId = Number(organizationId);
      
      console.log(`Access granted to resource id=${resourceId} for user ${req.user.id}`);
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