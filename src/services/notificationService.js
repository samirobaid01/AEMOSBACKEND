const config = require('../config');
const logger = require('../utils/logger');

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
 * Send welcome notifications to a newly registered user
 * @param {Object} user - User object
 * @returns {Promise<Object>} - Notification results
 */
const sendUserWelcomeNotifications = async (user) => {
  const results = {
    email: false,
    sms: false
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

  return results;
};

module.exports = {
  sendEmailNotification,
  sendSMSNotification,
  sendUserWelcomeNotifications
}; 