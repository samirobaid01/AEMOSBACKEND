const { ApiError } = require('./errorHandler');
const { userIsSystemAdmin, getUserOrganizations } = require('../services/roleService');

/**
 * Middleware to check if user belongs to this organization
 * This will be used to restrict access to only organizations the user belongs to
 */
const checkUserBelongsToOrganization = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const userId = req.user.id;
    const organizationId = req.params.id || req.body.organizationId;
    
    if (!organizationId) {
      return next();
    }
    
    // Check if user is a System Admin - they can access all organizations
    const isSystemAdmin = await userIsSystemAdmin(userId);
    if (isSystemAdmin) {
      // System admins can access any organization
      console.log(`System admin ${userId} granted access to organization ${organizationId}`);
      return next();
    }
    
    // Get organizations the user belongs to
    const userOrganizations = await getUserOrganizations(userId);
    const orgIds = userOrganizations.map(org => org.id);
    
    // Check if user belongs to this organization
    if (!orgIds.includes(Number(organizationId))) {
      console.log(`Access denied: User ${userId} does not belong to organization ${organizationId}`);
      throw new ApiError(403, 'Forbidden: You do not have access to this organization');
    }
    
    // If we reach here, user belongs to this organization
    console.log(`User ${userId} granted access to organization ${organizationId}`);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to load and attach user's organizations to the request
 * This will be used to filter the list of organizations
 */
const attachUserOrganizations = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const userId = req.user.id;
    
    // Check if user is a System Admin
    const isSystemAdmin = await userIsSystemAdmin(userId);
    req.isSystemAdmin = isSystemAdmin;
    
    // If not a system admin, get the organizations the user belongs to
    if (!isSystemAdmin) {
      const userOrganizations = await getUserOrganizations(userId);
      req.userOrganizationIds = userOrganizations.map(org => org.id);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkUserBelongsToOrganization,
  attachUserOrganizations
}; 