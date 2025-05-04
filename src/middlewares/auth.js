const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const config = require('../config');
const { User, Role } = require('../models/initModels');
const { isTokenBlacklisted } = require('../services/tokenBlacklistService');

/**
 * Authentication middleware to protect routes
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Check if token is blacklisted (logged out)
    if (isTokenBlacklisted(token)) {
      throw new ApiError(401, 'Token is no longer valid');
    }
    
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Check if user exists
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      throw new ApiError(401, 'User not found or inactive');
    }
    
    // Add user to request object
    req.user = user;
    // Store token in request for potential logout
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError(401, 'Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Authorization middleware to restrict access based on roles
 * @param {Array} roles - Allowed roles
 */
const authorize = (roles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }
      
      // Get user's role from OrganizationUser relation
      // Assuming user has a role property from previous middleware
      const userRole = await Role.findByPk(req.user.role);
      
      if (!userRole || !roles.includes(userRole.name)) {
        throw new ApiError(403, 'Access denied: Insufficient permissions');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticate,
  authorize
}; 