const config = require('../config');
const logger = require('../utils/logger');
const socketManager = require('../utils/socketManager');

/**
 * Send email notification to user
 * @param {Object} user - User object with email
 * @param {String} subject - Email subject
 * @param {String} message - Email message
 * @returns {Promise<boolean>} - Success status
 */
const sendEmailNotification = async (user, subject, message) => {
  try {
    // In a real-world application, this would connect to an email service
    // such as SendGrid, Mailgun, AWS SES, etc.
    
    logger.info(`[EMAIL] To: ${user.email}, Subject: ${subject}`);
    logger.debug(`[EMAIL CONTENT] ${message}`);
    
    // Simulate email sending success
    return true;
  } catch (error) {
    logger.error(`Failed to send email notification: ${error.message}`, { error });
    return false;
  }
};

/**
 * Send SMS notification to user
 * @param {Object} user - User object with smsNumber or phoneNumber
 * @param {String} message - SMS message
 * @returns {Promise<boolean>} - Success status
 */
const sendSMSNotification = async (user, message) => {
  try {
    // In a real-world application, this would connect to an SMS service
    // such as Twilio, Nexmo, AWS SNS, etc.
    
    const phoneNumber = user.smsNumber || user.phoneNumber;
    
    if (!phoneNumber) {
      logger.warn(`Cannot send SMS to user ${user.id}: No phone number provided`);
      return false;
    }
    
    logger.info(`[SMS] To: ${phoneNumber}`);
    logger.debug(`[SMS CONTENT] ${message}`);
    
    // Simulate SMS sending success
    return true;
  } catch (error) {
    logger.error(`Failed to send SMS notification: ${error.message}`, { error });
    return false;
  }
};

/**
 * Send real-time socket notification
 * @param {String|Array} targets - User ID, organization ID, area ID, or array of these
 * @param {String} event - Event name
 * @param {Object} data - Notification data
 * @returns {Boolean} - Success status
 */
const sendSocketNotification = (targets, event, data) => {
  try {
    // Validate event name
    if (!event || typeof event !== 'string') {
      logger.error('Invalid event name for socket notification');
      return false;
    }

    // Ensure data is an object
    const safeData = data && typeof data === 'object' ? data : { message: data };

    // If targets is null, undefined, or empty array, broadcast to all
    if (!targets || (Array.isArray(targets) && targets.length === 0)) {
      logger.warn('No specific targets for socket notification, broadcasting to all');
      socketManager.broadcastToAll(event, safeData);
      return true;
    }
    
    // If targets is an array, send to each target as a room
    if (Array.isArray(targets)) {
      // Filter out any invalid targets
      const validTargets = targets.filter(target => target);
      
      if (validTargets.length === 0) {
        logger.warn('No valid targets in array, broadcasting to all');
        socketManager.broadcastToAll(event, safeData);
        return true;
      }
      
      // Send to each valid target
      validTargets.forEach(target => {
        socketManager.broadcastToRoom(String(target), event, safeData);
      });
      
      return true;
    }
    
    // If targets is a string or number, send to that room
    if (typeof targets === 'string' || typeof targets === 'number') {
      socketManager.broadcastToRoom(String(targets), event, safeData);
      return true;
    }
    
    // If targets is something else, log a warning and broadcast to all
    logger.warn(`Unexpected targets type: ${typeof targets}, broadcasting to all`);
    socketManager.broadcastToAll(event, safeData);
    return true;
  } catch (error) {
    logger.error(`Failed to send socket notification: ${error.message}`, { error });
    return false;
  }
};

/**
 * Send welcome notifications to a newly registered user
 * @param {Object} user - User object
 * @returns {Promise<Object>} - Notification results
 */
const sendUserWelcomeNotifications = async (user) => {
  const results = {
    email: false,
    sms: false,
    socket: false
  };

  // Send email notification if enabled for user
  if (user.notifyByEmail) {
    const subject = 'Welcome to AEMOS';
    const message = `Hello ${user.userName || ''},\n\nYour account has been created successfully.\nWelcome to AEMOS!\n\nRegards,\nThe AEMOS Team`;
    
    results.email = await sendEmailNotification(user, subject, message);
  }

  // Send SMS notification if enabled for user
  if (user.notifyBySMS) {
    const message = `Welcome to AEMOS! Your account has been created successfully.`;
    
    results.sms = await sendSMSNotification(user, message);
  }
  
  // Send socket notification
  results.socket = sendSocketNotification(user.id, 'welcome', {
    userId: user.id,
    message: 'Welcome to AEMOS! Your account has been created successfully.',
    timestamp: new Date()
  });

  return results;
};

/**
 * Send generic notification across multiple channels
 * @param {Object} options - Notification options
 * @param {Object} options.user - User object
 * @param {String} options.subject - Email subject (for email)
 * @param {String} options.message - Notification message
 * @param {String} options.event - Socket event name
 * @param {Object} options.data - Additional data for socket notification
 * @param {Array|String} options.targets - Target rooms for socket notification (defaults to user.id)
 * @param {Boolean} options.email - Whether to send email
 * @param {Boolean} options.sms - Whether to send SMS
 * @param {Boolean} options.socket - Whether to send socket notification
 * @returns {Promise<Object>} - Notification results
 */
const sendNotification = async (options) => {
  const results = {
    email: false,
    sms: false,
    socket: false
  };

  // Default options
  const {
    user,
    subject = 'AEMOS Notification',
    message,
    event = 'notification',
    data = {},
    targets = user?.id,
    email = user?.notifyByEmail || false,
    sms = user?.notifyBySMS || false,
    socket = true
  } = options;

  // Validate essential parameters
  if (!message) {
    logger.error('Cannot send notification: No message provided');
    return results;
  }

  // Send email notification
  if (email && user?.email) {
    results.email = await sendEmailNotification(user, subject, message);
  }

  // Send SMS notification
  if (sms && user) {
    results.sms = await sendSMSNotification(user, message);
  }

  // Send socket notification
  if (socket) {
    const socketData = {
      ...data,
      message,
      timestamp: new Date()
    };
    
    if (user?.id) {
      socketData.userId = user.id;
    }
    
    results.socket = sendSocketNotification(targets, event, socketData);
  }

  return results;
};

module.exports = {
  sendEmailNotification,
  sendSMSNotification,
  sendSocketNotification,
  sendUserWelcomeNotifications,
  sendNotification
}; 