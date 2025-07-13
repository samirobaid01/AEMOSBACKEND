/**
 * Message Router Service for routing messages from any protocol to appropriate business logic
 */
const logger = require('../utils/logger');
const CommonAdapter = require('../adapters/commonAdapter');
const MQTTAdapter = require('../adapters/mqttAdapter');
const dataStreamController = require('../controllers/dataStreamController');
const deviceController = require('../controllers/deviceController');
const { DeviceToken } = require('../models/initModels');

class MessageRouter {
  constructor() {
    this.routes = new Map();
    this.initializeRoutes();
  }
  
  /**
   * Initialize message routes
   */
  initializeRoutes() {
    // Data stream routes
    this.routes.set('dataStream', this.handleDataStream.bind(this));
    
    // Device status routes
    this.routes.set('deviceStatus', this.handleDeviceStatus.bind(this));
    
    // Command routes
    this.routes.set('commands', this.handleCommands.bind(this));
    
    // Broadcast routes
    this.routes.set('broadcast', this.handleBroadcast.bind(this));
  }
  
  /**
   * Route message to appropriate handler
   * @param {Object} message - Normalized message object
   * @returns {Promise<Object>} Processing result
   */
  async route(message) {
    try {
      // Validate message
      const validation = CommonAdapter.validateMessage(message);
      if (!validation.isValid) {
        logger.error(`Message validation failed: ${validation.errors.join(', ')}`);
        return CommonAdapter.createErrorResponse(validation.errors.join(', '), 'VALIDATION_ERROR');
      }
      
      // Transform message
      const transformedMessage = CommonAdapter.transformMessage(message);
      
      // Determine message type
      const messageType = this.getMessageType(transformedMessage);
      
      // Get route handler
      const handler = this.routes.get(messageType);
      if (!handler) {
        logger.warn(`No handler found for message type: ${messageType}`);
        return CommonAdapter.createErrorResponse(`Unknown message type: ${messageType}`, 'UNKNOWN_MESSAGE_TYPE');
      }
      
      // Process message
      const result = await handler(transformedMessage);
      
      // Log processing
      CommonAdapter.logMessageProcessing(transformedMessage, 'routed');
      
      return result;
    } catch (error) {
      logger.error(`Error routing message: ${error.message}`);
      return CommonAdapter.createErrorResponse(`Routing error: ${error.message}`, 'ROUTING_ERROR');
    }
  }
  
  /**
   * Get message type from topic
   * @param {Object} message - Message object
   * @returns {string} Message type
   */
  getMessageType(message) {
    if (message.protocol === 'mqtt') {
      return MQTTAdapter.getMessageType(message.topic);
    }
    
    // For HTTP messages, determine type from path
    if (message.protocol === 'http') {
      const path = message.topic || message.path || '';
      if (path.includes('/datastream')) {
        return 'dataStream';
      } else if (path.includes('/status')) {
        return 'deviceStatus';
      } else if (path.includes('/commands')) {
        return 'commands';
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Handle data stream messages
   * @param {Object} message - Message object
   * @returns {Promise<Object>} Processing result
   */
  async handleDataStream(message) {
    try {
      // Extract device UUID from topic
      const deviceUuid = MQTTAdapter.extractDeviceUuid(message.topic);
      if (!deviceUuid) {
        return CommonAdapter.createErrorResponse('Invalid device UUID in topic', 'INVALID_DEVICE_UUID');
      }
      
      // Authenticate device
      const device = await this.authenticateDevice(deviceUuid, message);
      if (!device) {
        return CommonAdapter.createErrorResponse('Device authentication failed', 'AUTHENTICATION_FAILED');
      }
      
      // Create mock request object for controller
      const mockReq = {
        body: message.payload,
        sensorId: device.sensorId,
        device: device
      };
      
      const mockRes = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        })
      };
      
      // Call data stream controller
      const result = await dataStreamController.createDataStreamWithToken(mockReq, mockRes);
      
      return CommonAdapter.createSuccessResponse(result);
    } catch (error) {
      logger.error(`Error handling data stream: ${error.message}`);
      return CommonAdapter.createErrorResponse(`Data stream error: ${error.message}`, 'DATA_STREAM_ERROR');
    }
  }
  
  /**
   * Handle device status messages
   * @param {Object} message - Message object
   * @returns {Promise<Object>} Processing result
   */
  async handleDeviceStatus(message) {
    try {
      const deviceUuid = MQTTAdapter.extractDeviceUuid(message.topic);
      if (!deviceUuid) {
        return CommonAdapter.createErrorResponse('Invalid device UUID in topic', 'INVALID_DEVICE_UUID');
      }
      
      // Authenticate device
      const device = await this.authenticateDevice(deviceUuid, message);
      if (!device) {
        return CommonAdapter.createErrorResponse('Device authentication failed', 'AUTHENTICATION_FAILED');
      }
      
      // Update device status
      const mockReq = {
        params: { uuid: deviceUuid },
        body: message.payload
      };
      
      const mockRes = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        })
      };
      
      // Call device controller
      const result = await deviceController.updateDevice(mockReq, mockRes);
      
      return CommonAdapter.createSuccessResponse(result);
    } catch (error) {
      logger.error(`Error handling device status: ${error.message}`);
      return CommonAdapter.createErrorResponse(`Device status error: ${error.message}`, 'DEVICE_STATUS_ERROR');
    }
  }
  
  /**
   * Handle command messages
   * @param {Object} message - Message object
   * @returns {Promise<Object>} Processing result
   */
  async handleCommands(message) {
    try {
      const deviceUuid = MQTTAdapter.extractDeviceUuid(message.topic);
      if (!deviceUuid) {
        return CommonAdapter.createErrorResponse('Invalid device UUID in topic', 'INVALID_DEVICE_UUID');
      }
      
      // Authenticate device
      const device = await this.authenticateDevice(deviceUuid, message);
      if (!device) {
        return CommonAdapter.createErrorResponse('Device authentication failed', 'AUTHENTICATION_FAILED');
      }
      
      // Process command
      logger.info(`Processing command for device ${deviceUuid}:`, message.payload);
      
      return CommonAdapter.createSuccessResponse({
        deviceUuid,
        command: message.payload,
        processed: true
      });
    } catch (error) {
      logger.error(`Error handling command: ${error.message}`);
      return CommonAdapter.createErrorResponse(`Command error: ${error.message}`, 'COMMAND_ERROR');
    }
  }
  
  /**
   * Handle broadcast messages
   * @param {Object} message - Message object
   * @returns {Promise<Object>} Processing result
   */
  async handleBroadcast(message) {
    try {
      const organizationId = MQTTAdapter.extractOrganizationId(message.topic);
      if (!organizationId) {
        return CommonAdapter.createErrorResponse('Invalid organization ID in topic', 'INVALID_ORG_ID');
      }
      
      // Process broadcast message
      logger.info(`Processing broadcast for organization ${organizationId}:`, message.payload);
      
      return CommonAdapter.createSuccessResponse({
        organizationId,
        broadcast: message.payload,
        processed: true
      });
    } catch (error) {
      logger.error(`Error handling broadcast: ${error.message}`);
      return CommonAdapter.createErrorResponse(`Broadcast error: ${error.message}`, 'BROADCAST_ERROR');
    }
  }
  
  /**
   * Authenticate device using token
   * @param {string} deviceUuid - Device UUID
   * @param {Object} message - Message object
   * @returns {Promise<Object|null>} Device object or null
   */
  async authenticateDevice(deviceUuid, message) {
    try {
      // Extract token from message
      const token = message.payload.token || message.payload.accessToken;
      if (!token) {
        logger.warn(`No token provided for device ${deviceUuid}`);
        return null;
      }
      
      // Find device token
      const deviceToken = await DeviceToken.findOne({
        where: { 
          token: token,
          deviceUuid: deviceUuid
        },
        include: ['Device']
      });
      
      if (!deviceToken || !deviceToken.Device) {
        logger.warn(`Invalid token for device ${deviceUuid}`);
        return null;
      }
      
      // Check if token is expired
      if (deviceToken.expiresAt && new Date() > deviceToken.expiresAt) {
        logger.warn(`Expired token for device ${deviceUuid}`);
        return null;
      }
      
      return deviceToken.Device;
    } catch (error) {
      logger.error(`Error authenticating device ${deviceUuid}: ${error.message}`);
      return null;
    }
  }
}

module.exports = new MessageRouter(); 