const { User } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { sendUserWelcomeNotifications } = require('./notificationService');
const logger = require('../utils/logger');

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {boolean} notifyUser - Whether to send notifications to the user
 * @returns {Promise<Object>} Created user and notification results
 */
const createUser = async (userData, notifyUser = false) => {
  try {
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }
    
    // Create new user
    const user = await User.create(userData);
    
    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    // Send notifications if enabled
    let notificationResults = { email: false, sms: false };
    
    if (notifyUser) {
      logger.info(`Sending welcome notifications to user ${user.id}`);
      notificationResults = await sendUserWelcomeNotifications(user);
    }
    
    return {
      user: userResponse,
      notifications: notificationResults
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error(`Error creating user: ${error.message}`, { error });
    throw new ApiError(500, 'Failed to create user');
  }
};

/**
 * Get user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object>} User object
 */
const getUserById = async (id) => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password'] }
  });
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  return user;
};

/**
 * Get all users
 * @returns {Promise<Array>} Array of user objects
 */
const getAllUsers = async () => {
  return await User.findAll({
    attributes: { exclude: ['password'] }
  });
};

/**
 * Update user
 * @param {number} id - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user
 */
const updateUser = async (id, userData) => {
  const user = await User.findByPk(id);
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  // Update user
  await user.update(userData);
  
  // Remove password from response
  const userResponse = user.toJSON();
  delete userResponse.password;
  
  return userResponse;
};

/**
 * Delete user
 * @param {number} id - User ID
 * @returns {Promise<boolean>} Success status
 */
const deleteUser = async (id) => {
  const user = await User.findByPk(id);
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  await user.destroy();
  return true;
};

module.exports = {
  createUser,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser
}; 