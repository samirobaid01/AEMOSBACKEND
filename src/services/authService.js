const { User } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config');
const { blacklistToken } = require('./tokenBlacklistService');
const roleService = require('./roleService');

// Login a user and generate JWT token
const login = async (email, password) => {
  // Find user by email
  const user = await User.findOne({ where: { email } });
  
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }
  
  // Check if password matches
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }
  
  // Get user permissions and roles
  const permissions = await roleService.getUserPermissions(user.id);
  const roles = await roleService.getUserRoleNames(user.id);
  
  // Generate JWT token and refresh token
  const token = await generateToken(user);
  const refreshToken = await generateRefreshToken(user);
  
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleId
    },
    permissions,
    roles,
    token,
    refreshToken
  };
};

// Logout a user by invalidating the token
const logout = (token) => {
  try {
    // Verify the token to get its expiry time
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Calculate remaining time until token expiry (in seconds)
    const expiryTime = decoded.exp - Math.floor(Date.now() / 1000);
    
    // Add token to blacklist until it expires
    blacklistToken(token, expiryTime);
    
    return true;
  } catch (error) {
    // If token is invalid or expired, no need to blacklist
    return false;
  }
};

// Generate JWT token
const generateToken = async (user) => {
  // Get user permissions and roles
  const permissions = await roleService.getUserPermissions(user.id);
  const roles = await roleService.getUserRoleNames(user.id);
  
  const payload = {
    id: user.id,
    email: user.email,
    roleId: user.roleId,
    permissions,
    roles
  };
  
  return jwt.sign(
    payload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Generate refresh token with longer expiry
const generateRefreshToken = async (user) => {
  const payload = {
    id: user.id,
    tokenType: 'refresh'
  };
  
  return jwt.sign(
    payload,
    config.jwt.secret,
    { expiresIn: '7d' } // Refresh tokens typically have longer expiry
  );
};

// Refresh access token using refresh token
const refreshToken = async (token) => {
  try {
    // Verify the refresh token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Check if it's a refresh token
    if (decoded.tokenType !== 'refresh') {
      throw new ApiError(401, 'Invalid refresh token');
    }
    
    // Get user from database
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      throw new ApiError(401, 'User not found');
    }
    
    // Generate new access token
    const newToken = await generateToken(user);
    
    return {
      token: newToken
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid refresh token');
    } else if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Refresh token expired');
    } else {
      throw error;
    }
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token');
  }
};

module.exports = {
  login,
  logout,
  generateToken,
  verifyToken,
  refreshToken,
  generateRefreshToken
}; 