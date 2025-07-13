/**
 * Common Adapter with shared validation and transformation logic
 */
const logger = require('../utils/logger');

class CommonAdapter {
  /**
   * Common message validation
   * @param {Object} message - Message object
   * @returns {Object} Validation result
   */
  static validateMessage(message) {
    const errors = [];
    
    if (!message) {
      errors.push('Message is required');
      return { isValid: false, errors };
    }
    
    if (!message.protocol) {
      errors.push('Protocol is required');
    }
    
    if (!message.timestamp) {
      errors.push('Timestamp is required');
    }
    
    if (!message.payload) {
      errors.push('Payload is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Transform message to common format
   * @param {Object} message - Original message
   * @returns {Object} Transformed message
   */
  static transformMessage(message) {
    try {
      const transformed = {
        ...message,
        timestamp: message.timestamp || new Date(),
        processedAt: new Date()
      };
      
      // Add metadata
      transformed.metadata = {
        protocol: message.protocol,
        source: message.clientId || message.source || 'unknown',
        version: '1.0'
      };
      
      return transformed;
    } catch (error) {
      logger.error(`Error transforming message: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Extract common fields from message
   * @param {Object} message - Message object
   * @returns {Object} Extracted fields
   */
  static extractCommonFields(message) {
    return {
      protocol: message.protocol,
      timestamp: message.timestamp,
      source: message.clientId || message.source,
      topic: message.topic,
      payload: message.payload
    };
  }
  
  /**
   * Create error response
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @returns {Object} Error response
   */
  static createErrorResponse(message, code = 'VALIDATION_ERROR') {
    return {
      status: 'error',
      code,
      message,
      timestamp: new Date()
    };
  }
  
  /**
   * Create success response
   * @param {Object} data - Response data
   * @returns {Object} Success response
   */
  static createSuccessResponse(data) {
    return {
      status: 'success',
      data,
      timestamp: new Date()
    };
  }
  
  /**
   * Sanitize message payload
   * @param {Object} payload - Message payload
   * @returns {Object} Sanitized payload
   */
  static sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(payload)) {
      // Remove potentially dangerous keys
      if (key.startsWith('__') || key.startsWith('$')) {
        continue;
      }
      
      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Validate device authentication
   * @param {Object} message - Message object
   * @param {Object} device - Device object
   * @returns {boolean} Authentication result
   */
  static validateDeviceAuth(message, device) {
    if (!device) {
      return false;
    }
    
    // Check if device is active
    if (device.status !== 'active') {
      return false;
    }
    
    // Check if device belongs to the correct organization (if specified)
    if (message.organizationId && device.organizationId !== message.organizationId) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Log message processing
   * @param {Object} message - Message object
   * @param {string} action - Action performed
   */
  static logMessageProcessing(message, action) {
    logger.info(`Message processed: ${action}`, {
      protocol: message.protocol,
      topic: message.topic,
      source: message.clientId || message.source,
      action
    });
  }
}

module.exports = CommonAdapter; 