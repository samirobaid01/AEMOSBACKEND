/**
 * Message Router Service for routing messages from any protocol to appropriate business logic
 */
const logger = require('../utils/logger');
const CommonAdapter = require('../adapters/commonAdapter');
const MQTTAdapter = require('../adapters/mqttAdapter');
const CoapAdapter = require('../adapters/coapAdapter');
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
    
    // Device state routes
    this.routes.set('deviceState', this.handleDeviceState.bind(this));
    
    // Rule chain routes
    this.routes.set('ruleChain', this.handleRuleChain.bind(this));
    
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
    console.log('message protocol in getMessageType', message.protocol);
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

    // CoAP messages share the same REST-ish path scheme as HTTP
    if (message.protocol === 'coap') {
      const path = message.path || message.topic || '';
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
      // Extract device UUID from message context (topic/path/metadata)
      const deviceUuid = this.extractDeviceUuid(message);
      if (!deviceUuid) {
        return CommonAdapter.createErrorResponse('Invalid device identifier in message', 'INVALID_DEVICE_UUID');
      }
      
      // Check if this is from internal publisher (no authentication needed)
      const isInternalPublisher = message.clientId && message.clientId.startsWith('aemos-publisher-');
      
      // Skip processing entirely for internal publisher messages to prevent feedback loops
      if (isInternalPublisher) {
        logger.info(`Skipping data stream processing for internal publisher message from ${message.clientId} to prevent feedback loop`);
        return CommonAdapter.createSuccessResponse({
          message: 'Internal publisher data stream message acknowledged (no processing)',
          topic: message.topic,
          deviceUuid: deviceUuid,
          skipped: true
        });
      }
      
      // Authenticate device for external clients
      const device = await this.authenticateDevice(deviceUuid, message);
      if (!device) {
        return CommonAdapter.createErrorResponse('Device authentication failed', 'AUTHENTICATION_FAILED');
      }
      
      if (!device) {
        return CommonAdapter.createErrorResponse('Device not found', 'DEVICE_NOT_FOUND');
      }
      
      // Handle both single data stream and batch data stream formats
      let dataStreams = [];
      
      if (message.payload.dataStreams && Array.isArray(message.payload.dataStreams)) {
        // Batch data stream format
        dataStreams = message.payload.dataStreams;
        logger.debug(`Processing batch data stream with ${dataStreams.length} items`);
      } else if (message.payload.value && message.payload.telemetryDataId) {
        // Single data stream format
        dataStreams = [message.payload];
        logger.debug(`Processing single data stream`);
      } else {
        logger.warn(`Invalid data stream message: missing required fields`, {
          topic: message.topic || message.path,
          payload: message.payload,
          deviceUuid: device.uuid
        });
        return CommonAdapter.createErrorResponse('Invalid message payload: value and telemetryDataId are required, or dataStreams array', 'INVALID_PAYLOAD');
      }
      
      // Validate each data stream in the batch
      for (const dataStream of dataStreams) {
        if (!dataStream.value || !dataStream.telemetryDataId) {
          logger.warn(`Invalid data stream in batch: missing required fields`, {
            dataStream,
            deviceUuid: device.uuid
          });
          return CommonAdapter.createErrorResponse('Invalid data stream: value and telemetryDataId are required', 'INVALID_DATA_STREAM');
        }
      }
      
      // Extract organization ID for rule chain triggering
      const organizationId = this.extractOrganizationId(message) || message.payload?.organizationId || 1;
      
      // Process each data stream
      const results = [];
      for (const dataStream of dataStreams) {
        // Create mock request object for controller with protocol context
        const mockReq = {
          body: dataStream,
          sensorId: device.sensorId,
          device: device,
          deviceUuid: device.uuid,
          // Pass protocol context for conditional publishing
          originProtocol: message.protocol || 'http', // Default to http for HTTP routes
          organizationId: organizationId
        };
        
        const mockRes = {
          status: (code) => ({
            json: (data) => ({ statusCode: code, data })
          })
        };
        
        // Call data stream controller
        const result = await dataStreamController.createDataStreamWithToken(mockReq, mockRes);
        results.push(result);
      }
      
      return CommonAdapter.createSuccessResponse({
        message: `Processed ${dataStreams.length} data stream(s)`,
        results: results
      });
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
      const deviceUuid = this.extractDeviceUuid(message);
      if (!deviceUuid) {
        return CommonAdapter.createErrorResponse('Invalid device identifier in message', 'INVALID_DEVICE_UUID');
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
   * Handle device state messages
   * @param {Object} message - Message object
   * @returns {Promise<Object>} Processing result
   */
  async handleDeviceState(message) {
    try {
      // Skip processing if this is from internal publisher to prevent feedback loops
      if (message.clientId && message.clientId.startsWith('aemos-publisher-')) {
        logger.info(`Skipping device state processing for internal publisher message from ${message.clientId}`);
        return CommonAdapter.createSuccessResponse({
          message: 'Internal publisher message acknowledged (no processing)',
          topic: message.topic,
          deviceUuid: message.payload.deviceUuid,
          skipped: true
        });
      }

      
      return CommonAdapter.createSuccessResponse({
        message: 'Device state message acknowledged',
        topic: message.topic,
        deviceUuid: message.payload.deviceUuid
      });
    } catch (error) {
      logger.error(`Error handling device state: ${error.message}`);
      return CommonAdapter.createErrorResponse(`Device state error: ${error.message}`, 'DEVICE_STATE_ERROR');
    }
  }
  
  /**
   * Handle rule chain messages
   * @param {Object} message - Message object
   * @returns {Promise<Object>} Processing result
   */
  async handleRuleChain(message) {
    try {
      // Skip processing if this is from internal publisher to prevent feedback loops
      if (message.clientId && message.clientId.startsWith('aemos-publisher-')) {
        logger.info(`Skipping rule chain processing for internal publisher message from ${message.clientId}`);
        return CommonAdapter.createSuccessResponse({
          message: 'Internal publisher rule chain message acknowledged (no processing)',
          topic: message.topic,
          organizationId: message.payload.organizationId,
          ruleChainId: message.payload.ruleChainId,
          skipped: true
        });
      }

   
      
      return CommonAdapter.createSuccessResponse({
        message: 'Rule chain message acknowledged',
        topic: message.topic,
        organizationId: message.payload.organizationId,
        ruleChainId: message.payload.ruleChainId
      });
    } catch (error) {
      logger.error(`Error handling rule chain: ${error.message}`);
      return CommonAdapter.createErrorResponse(`Rule chain error: ${error.message}`, 'RULE_CHAIN_ERROR');
    }
  }
  
  /**
   * Handle command messages
   * @param {Object} message - Message object
   * @returns {Promise<Object>} Processing result
   */
  async handleCommands(message) {
    try {
      const deviceUuid = this.extractDeviceUuid(message);
      if (!deviceUuid) {
        return CommonAdapter.createErrorResponse('Invalid device identifier in message', 'INVALID_DEVICE_UUID');
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
      const organizationId = this.extractOrganizationId(message);
      if (!organizationId) {
        return CommonAdapter.createErrorResponse('Invalid organization identifier in message', 'INVALID_ORG_ID');
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
      
      // Find device token with sensor relationship
      const deviceToken = await DeviceToken.findOne({
        where: { 
          token: token,
          status: 'active'
        },
        include: [{ 
          model: require('../models/Sensor'), 
          attributes: ['id', 'uuid', 'name'] 
        }]
      });
      
      if (!deviceToken || !deviceToken.Sensor) {
        logger.warn(`Invalid token for device ${deviceUuid}`);
        return null;
      }
      
      // Check if the sensor UUID matches the provided deviceUuid
      if (deviceToken.Sensor.uuid !== deviceUuid) {
        logger.warn(`Device UUID mismatch: expected ${deviceUuid}, got ${deviceToken.Sensor.uuid}`);
        return null;
      }
      
      // Check if token is expired
      if (deviceToken.expiresAt && new Date() > deviceToken.expiresAt) {
        logger.warn(`Expired token for device ${deviceUuid}`);
        return null;
      }
      
      return {
        sensorId: deviceToken.Sensor.id,
        uuid: deviceToken.Sensor.uuid,
        name: deviceToken.Sensor.name
      };
    } catch (error) {
      logger.error(`Error authenticating device ${deviceUuid}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract device UUID across supported protocols
   * @param {Object} message
   * @returns {string|null}
   */
  extractDeviceUuid(message) {
    if (message.deviceUuid) {
      return message.deviceUuid;
    }

    if (message.payload && message.payload.deviceUuid) {
      return message.payload.deviceUuid;
    }

    if (message.protocol === 'coap' || message.protocol === 'http') {
      const path = message.path || message.topic || '';
      return CoapAdapter.extractDeviceUuid(path, { query: message.query });
    }

    return MQTTAdapter.extractDeviceUuid(message.topic);
  }

  /**
   * Extract organization ID across supported protocols
   * @param {Object} message
   * @returns {string|null}
   */
  extractOrganizationId(message) {
    if (message.organizationId) {
      return message.organizationId;
    }

    if (message.payload && message.payload.organizationId) {
      return message.payload.organizationId;
    }

    if (message.protocol === 'coap' || message.protocol === 'http') {
      const path = message.path || message.topic || '';
      return CoapAdapter.extractOrganizationId(path, { query: message.query });
    }

    return MQTTAdapter.extractOrganizationId(message.topic);
  }
}

module.exports = new MessageRouter(); 