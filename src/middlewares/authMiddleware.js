const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const { User } = require('../models/initModels');
const roleService = require('../services/roleService');

/**
 * Middleware to verify JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get auth header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(new ApiError(401, 'Access token is required'));
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return next(new ApiError(401, 'Token expired'));
        }
        return next(new ApiError(403, 'Invalid token'));
      }

      // Check if user exists in database
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return next(new ApiError(404, 'User not found'));
      }

      // Add user object to request
      req.user = user;
      next();
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user has the required role
 * @param {Array} allowedRoles - Array of role names allowed to access the route
 */
const checkRoleAccess = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.id) {
        return next(new ApiError(401, 'Authentication required'));
      }

      // Get user roles from service
      const userRolesData = await roleService.getUserRoles(req.user.id);
      
      // Extract role names from the data
      const userRoles = userRolesData.map(role => role.name.toLowerCase());
      
      // Check if user has system admin role (always grant access)
      if (userRoles.includes('system admin') || userRoles.includes('admin')) {
        return next();
      }
      
      // Check if user has any of the allowed roles
      const hasAllowedRole = allowedRoles.some(role => 
        userRoles.includes(role.toLowerCase())
      );
      
      if (!hasAllowedRole) {
        return next(new ApiError(403, 'Insufficient role permissions'));
      }
      
      next();
    } catch (error) {
      console.error('Error in checkRoleAccess middleware:', error.message);
      next(error);
    }
  };
};

/**
 * Middleware to check if user has the required permissions
 * @param {Array} requiredPermissions - Array of permission codes required to access the route
 */
const checkPermission = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.id) {
        return next(new ApiError(401, 'Authentication required'));
      }

      // Get user permissions from service
      const userPermissions = await roleService.getUserPermissions(req.user.id);
      
      // Check if user is a system admin (has all permissions)
      const isSystemAdmin = await roleService.userIsSystemAdmin(req.user.id);
      if (isSystemAdmin) {
        return next();
      }
      
      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        return next(new ApiError(403, 'Insufficient permissions'));
      }
      
      next();
    } catch (error) {
      console.error('Error in checkPermission middleware:', error.message);
      next(error);
    }
  };
};

module.exports = {
  authenticateToken,
  checkRoleAccess,
  checkPermission
}; 