const authService = require('../services/authService');
const { ApiError } = require('../middlewares/errorHandler');

// Login user and generate token
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);
    
    res.status(200).json({
      status: 'success',
      data: {
        user,
        token
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
  getCurrentUser
}; 