const { ApiError } = require('./errorHandler');
const { userIsSystemAdmin, getUserOrganizations } = require('../services/roleService');

/**
 * Middleware to attach user's organizations to request for area filtering
 * This will be used to filter the areas by the organizations the user belongs to
 */
const attachUserOrganizationsForAreas = async (req, res, next) => {
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
      console.log(`User ${userId} belongs to organizations: ${req.userOrganizationIds.join(', ')}`);
    } else {
      console.log(`User ${userId} is a system admin, no organization filtering needed`);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  attachUserOrganizationsForAreas
}; 