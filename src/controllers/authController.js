const authService = require('../services/authService');
const userService = require('../services/userService');
const { ApiError } = require('../middlewares/errorHandler');

// Login user and generate token
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token, refreshToken } = await authService.login(email, password);
    
    res.status(200).json({
      status: 'success',
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// Logout user by invalidating token
const logout = async (req, res, next) => {
  try {
    // The token is already verified and attached to req by the authenticate middleware
    const token = req.token;
    
    // Invalidate the token
    authService.logout(token);
    
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Refresh access token using refresh token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }
    
    const { token } = await authService.refreshToken(refreshToken);
    
    res.status(200).json({
      status: 'success',
      data: {
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Signup a new user
const signup = async (req, res, next) => {
  try {
    const userData = req.body;
    // Extract notifyUser flag but don't include it in user creation data
    const { notifyUser, ...userCreateData } = userData;
    
    // Create the user and optionally send notifications
    const { user, notifications } = await userService.createUser(
      userCreateData, 
      notifyUser || false
    );
    
    // Generate JWT token for automatic login
    const token = authService.generateToken(user);
    const refreshToken = authService.generateRefreshToken(user);
    
    res.status(201).json({
      status: 'success',
      data: {
        user,
        token,
        refreshToken,
        notifications: notifyUser ? notifications : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user information
const getCurrentUser = async (req, res, next) => {
  try {
    // User information is already attached to req.user by the authenticate middleware
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  signup,
  getCurrentUser,
  refreshToken
}; 