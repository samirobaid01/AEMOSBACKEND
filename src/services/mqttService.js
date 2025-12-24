/**
 * MQTT Service for handling MQTT connections, authentication, and message routing
 */
const aedes = require('aedes')();
const net = require('net');
const logger = require('../utils/logger');
const config = require('../config');
const MQTTAdapter = require('../adapters/mqttAdapter');
const messageRouter = require('./messageRouter');
const { DeviceToken } = require('../models/initModels');

class MQTTService {
  constructor() {
    this.server = null;
    this.clients = new Map();
    this.authenticatedClients = new Map();
    this.isInitialized = false;
  }
  
  /**
   * Initialize MQTT server
   * @param {number} port - MQTT server port
   * @param {string} host - MQTT server host
   */
  initialize(port = config.features.mqtt.port, host = config.features.mqtt.host) {
    if (this.isInitialized) {
      logger.warn('MQTT server already initialized');
      return;
    }
    
    try {
      // Create MQTT server using aedes
      this.server = net.createServer(aedes.handle);
      
      // Handle client connections
      aedes.on('client', (client) => {
        this.handleClientConnection(client);
      });
      
      // Handle client authentication
      aedes.authenticate = async (client, username, password, callback) => {
        try {
          const isAuthenticated = await this.authenticateClient(client, username, password);
          if (isAuthenticated) {
            callback(null, true);
          } else {
            callback(new Error('Authentication failed'), false);
          }
        } catch (error) {
          logger.error(`Authentication error: ${error.message}`);
          callback(error, false);
        }
      };
      
      // Handle published messages
      aedes.on('publish', (packet, client) => {
        if (client) {
          this.handlePublish(client, packet);
        }
      });
      
      // Handle server errors
      this.server.on('error', (error) => {
        logger.error(`MQTT server error: ${error.message}`);
      });
      
      // Start server
      this.server.listen(port, host, () => {
        logger.info(`MQTT server started on ${host}:${port}`);
        this.isInitialized = true;
      });
      
    } catch (error) {
      logger.error(`Failed to initialize MQTT server: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Handle client connection
   * @param {Object} client - MQTT client
   */
  handleClientConnection(client) {
    logger.info(`MQTT client connected: ${client.id}`);
    
    // Store client
    this.clients.set(client.id, client);
    
    // Handle client disconnection
    aedes.on('clientDisconnect', (client) => {
      this.handleClientDisconnect(client);
    });
    
    // Handle client errors
    client.on('error', (error) => {
      logger.error(`MQTT client error (${client.id}): ${error.message}`);
    });
    
    // Handle subscriptions
    aedes.on('subscribe', (subscriptions, client) => {
      if (client) {
        this.handleSubscribe(client, subscriptions);
      }
    });
    
    // Handle unsubscriptions
    aedes.on('unsubscribe', (unsubscriptions, client) => {
      if (client) {
        this.handleUnsubscribe(client, unsubscriptions);
      }
    });
  }
  

  
  /**
   * Authenticate client
   * @param {Object} client - MQTT client
   * @param {string} username - Username
   * @param {string} password - Password/token
   * @returns {Promise<boolean>} Authentication result
   */
  async authenticateClient(client, username, password) {
    try {
      logger.info(`🔐 MQTT Authentication attempt for client ${client.id}`);
      logger.info(`   Username: ${username}`);
      logger.info(`   Password length: ${password ? password.length : 0}`);
      logger.info(`   Token-based auth enabled: ${config.features.mqtt.authentication.tokenBased}`);

      // Allow internal publisher with dedicated credentials
      if (username === 'publisher' && password?.toString() === 'publisher-secret') {
        logger.info(`✅ Internal publisher authenticated: ${client.id}`);
        return true;
      }
      
      // For testing, allow connections without credentials if authentication is not strictly required
      if (!username || !password) {
        if (process.env.NODE_ENV === 'development' || process.env.MQTT_ALLOW_UNAUTHENTICATED === 'true') {
          logger.info(`Allowing unauthenticated MQTT connection for client ${client.id} (development mode)`);
          return true;
        }
        logger.warn(`No credentials provided for client ${client.id}`);
        return false;
      }
      
      // For token-based authentication, username is device UUID and password is token
      if (config.features.mqtt.authentication.tokenBased) {
        const deviceUuid = username;
        const token = password;
        
        logger.info(`🔍 Looking up device token for UUID: ${deviceUuid}`);
        
        // Find device token with sensor relationship
        const deviceToken = await DeviceToken.findOne({
          where: { 
            token: token,
            status: 'active'
          },
          include: [{ 
            model: require('../models/Sensor'), 
            attributes: ['uuid'] 
          }]
        });
        
        if (!deviceToken) {
          logger.warn(`❌ Device token not found for token: ${token.substring(0, 8)}...`);
          return false;
        }
        
        if (!deviceToken.Sensor) {
          logger.warn(`❌ No sensor associated with device token`);
          return false;
        }
        
        logger.info(`✅ Found device token with sensor UUID: ${deviceToken.Sensor.uuid}`);
        
        // Check if the sensor UUID matches the provided deviceUuid
        if (deviceToken.Sensor.uuid !== deviceUuid) {
          logger.warn(`❌ Device UUID mismatch: expected ${deviceUuid}, got ${deviceToken.Sensor.uuid}`);
          return false;
        }
        
        // Check if token is expired
        if (deviceToken.expiresAt && new Date() > deviceToken.expiresAt) {
          logger.warn(`❌ Device token expired at: ${deviceToken.expiresAt}`);
          return false;
        }
        
        // Store authenticated client
        this.authenticatedClients.set(client.id, {
          deviceUuid,
          token,
          authenticatedAt: new Date()
        });
        
        logger.info(`✅ MQTT client ${client.id} authenticated successfully`);
        return true;
      }
      
      // For username/password authentication
      logger.warn(`❌ Username/password authentication not implemented`);
      return false;
      
    } catch (error) {
      logger.error(`❌ Error authenticating client: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Handle client disconnect
   * @param {Object} client - MQTT client
   */
  handleClientDisconnect(client) {
    logger.info(`MQTT client disconnected: ${client.id}`);
    
    // Remove from clients map
    this.clients.delete(client.id);
    this.authenticatedClients.delete(client.id);
  }
  
  /**
   * Handle publish message
   * @param {Object} client - MQTT client
   * @param {Object} packet - Publish packet
   */
  async handlePublish(client, packet) {
    try {
      const { topic, payload, qos, retain } = packet;
      
      // Check if this is from internal publisher (system-generated messages)
      const isInternalPublisher = client.id && client.id.startsWith('aemos-publisher-');
      
      if (isInternalPublisher) {
        // Internal publisher messages are system-generated (e.g., rule chain results, notifications)
        // These are echoes from our own publisher, so we skip processing to avoid feedback loops
        logger.debug(`🔄 Internal MQTT publisher message (skipped): ${topic} from ${client.id}`);
        return; // Skip processing internal publisher messages
      }
      
      // External MQTT client message
      logger.info(`📥 MQTT publish received: ${topic} from external client ${client.id}`);
      
      // Check authentication for external clients
      if (config.features.mqtt.authentication.enabled) {
        const authInfo = this.authenticatedClients.get(client.id);
        if (!authInfo) {
          logger.warn(`Unauthenticated client ${client.id} attempted to publish to ${topic}`);
          // For testing, allow unauthenticated clients to publish but log warning
          // In production, you would return here to block unauthenticated messages
        }
      }
      
      // Normalize message
      const normalizedMessage = MQTTAdapter.normalizeMessage(topic, payload, {
        id: client.id,
        qos: qos
      });
      
      // Validate message
      if (!MQTTAdapter.validateMessage(normalizedMessage)) {
        logger.warn(`Invalid MQTT message from ${client.id}: ${topic}`);
        return;
      }
      
      // Route message
      const result = await messageRouter.route(normalizedMessage);
      
      // Log result
      if (result.status === 'success') {
        logger.info(`✅ MQTT message processed: ${topic} from ${client.id}`, {
          protocol: 'mqtt',
          topic: topic,
          source: client.id,
          action: 'routed'
        });
      } else {
        logger.warn(`MQTT message processing failed: ${topic} - ${result.message}`);
      }
      
    } catch (error) {
      logger.error(`Error handling MQTT publish: ${error.message}`);
    }
  }
  
  /**
   * Handle subscribe
   * @param {Object} client - MQTT client
   * @param {Object} packet - Subscribe packet
   */
  handleSubscribe(client, packet) {
    try {
      // Handle different packet formats
      let subscriptions = packet.subscriptions;
      
      // If packet.subscriptions doesn't exist, try packet.subs (alternative format)
      if (!subscriptions && packet.subs) {
        subscriptions = packet.subs;
      }
      
      // If still no subscriptions, check if packet itself is an array
      if (!subscriptions && Array.isArray(packet)) {
        subscriptions = packet;
      }
      
      // Ensure subscriptions is an array
      if (!subscriptions || !Array.isArray(subscriptions)) {
        // Log at debug level instead of warn since this might be normal for some clients
        logger.debug(`No subscriptions or invalid format from ${client.id}:`, {
          packetType: typeof packet,
          hasSubscriptions: !!packet.subscriptions,
          hasSubs: !!packet.subs,
          isArray: Array.isArray(packet)
        });
        return;
      }
      
      logger.debug(`MQTT subscribe from ${client.id}:`, subscriptions);
      
      // Check if client is authenticated
      if (config.features.mqtt.authentication.enabled) {
        const authInfo = this.authenticatedClients.get(client.id);
        if (!authInfo) {
          logger.warn(`Unauthenticated client ${client.id} attempted to subscribe`);
          // For testing, allow unauthenticated clients to subscribe but log warning
          // In production, you would return here to block unauthenticated subscriptions
        }
      }
      
      // Accept subscriptions
      const granted = subscriptions.map(sub => ({
        topic: sub.topic,
        qos: Math.min(sub.qos || 0, 2) // Ensure QoS doesn't exceed 2
      }));
      
      client.suback({ messageId: packet.messageId, granted });
      
    } catch (error) {
      logger.error(`Error handling MQTT subscribe: ${error.message}`);
    }
  }
  
  /**
   * Handle unsubscribe
   * @param {Object} client - MQTT client
   * @param {Object} packet - Unsubscribe packet
   */
  handleUnsubscribe(client, packet) {
    try {
      // Handle different packet formats
      let unsubscriptions = packet.unsubscriptions;
      
      // If packet.unsubscriptions doesn't exist, try packet.unsubs (alternative format)
      if (!unsubscriptions && packet.unsubs) {
        unsubscriptions = packet.unsubs;
      }
      
      // If still no unsubscriptions, check if packet itself is an array
      if (!unsubscriptions && Array.isArray(packet)) {
        unsubscriptions = packet;
      }
      
      logger.debug(`MQTT unsubscribe from ${client.id}:`, unsubscriptions);
      
      // Accept unsubscriptions - check if client has unsuback method
      if (client && typeof client.unsuback === 'function') {
        client.unsuback({ messageId: packet.messageId });
      } else {
        logger.debug(`Client ${client.id} does not have unsuback method or is not available`);
      }
      
    } catch (error) {
      logger.error(`Error handling MQTT unsubscribe: ${error.message}`);
    }
  }
  
  /**
   * Publish message to topic
   * @param {string} topic - Topic to publish to
   * @param {Object} payload - Message payload
   * @param {Object} options - Publish options
   */
  publish(topic, payload, options = {}) {
    if (!this.isInitialized) {
      logger.error('MQTT server not initialized');
      return;
    }
    
    try {
      const message = {
        topic,
        payload: JSON.stringify(payload),
        qos: options.qos || config.features.mqtt.qos.default,
        retain: options.retain || false
      };
      
      // Publish to all connected clients
      this.clients.forEach(client => {
        client.publish(message);
      });
      
      logger.debug(`MQTT message published to ${topic}`);
    } catch (error) {
      logger.error(`Error publishing MQTT message: ${error.message}`);
    }
  }
  
  /**
   * Get server statistics
   * @returns {Object} Server statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      connectedClients: this.clients.size,
      authenticatedClients: this.authenticatedClients.size,
      port: config.features.mqtt.port,
      host: config.features.mqtt.host
    };
  }
  
  /**
   * Stop MQTT server
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        aedes.close(() => {
          logger.info('MQTT server stopped');
          this.isInitialized = false;
        });
      });
    }
  }
}

module.exports = new MQTTService(); 