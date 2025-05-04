const { User } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config');
const { blacklistToken } = require('./tokenBlacklistService');

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
  
  // Generate JWT token
  const token = generateToken(user);
  
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleId
    },
    token
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
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    roleId: user.roleId
  };
  
  return jwt.sign(
    payload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
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
  verifyToken
}; 