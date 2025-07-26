/**
 * MQTT Service for handling MQTT connections, authentication, and message routing
 */
const aedesFactory = require('aedes');
const net = require('net');
const logger = require('../utils/logger');
const config = require('../config');
const MQTTAdapter = require('../adapters/mqttAdapter');
const messageRouter = require('./messageRouter');
const { DeviceToken, Sensor } = require('../models/initModels');

class MQTTService {
  constructor() {
    this.server = null;
    this.clients = new Map();
    this.authenticatedClients = new Map();
    this.isInitialized = false;
  }
  
  /**
   * Initialize MQTT server (using aedes broker)
   * @param {number} port - MQTT server port
   * @param {string} host - MQTT server host
   */
  initialize(port = config.features.mqtt.port, host = config.features.mqtt.host) {
    if (this.isInitialized) {
      logger.warn('MQTT server already initialized');
      return;
    }

    try {
      // Create aedes broker instance
      this.aedes = aedesFactory();
      // Create TCP server for MQTT
      this.server = net.createServer(this.aedes.handle);

      // Handle client connections
      this.aedes.on('client', (client) => {
        logger.info(`MQTT client connected: ${client.id}`);
        this.clients.set(client.id, client);
      });

      // Handle client disconnect
      this.aedes.on('clientDisconnect', (client) => {
        logger.info(`MQTT client disconnected: ${client.id}`);
        this.clients.delete(client.id);
        this.authenticatedClients.delete(client.id);
      });

      // Authenticate clients
      this.aedes.authenticate = async (client, username, password, callback) => {
        try {
          if (!config.features.mqtt.authentication.enabled) {
            return callback(null, true);
          }
          const isAuthenticated = await this.authenticateClient(client, username && username.toString(), password && password.toString());
          if (!isAuthenticated) {
            logger.warn(`Authentication failed for client: ${client.id}`);
            return callback(null, false);
          }
          logger.info(`MQTT client authenticated: ${client.id}`);
          return callback(null, true);
        } catch (error) {
          logger.error(`Error authenticating client: ${error.message}`);
          return callback(error, false);
        }
      };

      // Handle published messages
      this.aedes.on('publish', async (packet, client) => {
        if (client) {
          await this.handlePublish(client, packet);
        }
      });

      // Handle subscriptions
      this.aedes.on('subscribe', (subscriptions, client) => {
        // Optionally handle/validate subscriptions here
        // You can call this.handleSubscribe(client, { subscriptions }) if needed
      });

      // Handle unsubscriptions
      this.aedes.on('unsubscribe', (subscriptions, client) => {
        // Optionally handle/validate unsubscriptions here
        // You can call this.handleUnsubscribe(client, { unsubscriptions: subscriptions }) if needed
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
    
    // Handle client authentication
    client.on('connect', (packet) => {
      this.handleClientConnect(client, packet);
    });
    
    // Handle client disconnection
    client.on('close', () => {
      this.handleClientDisconnect(client);
    });
    
    // Handle client errors
    client.on('error', (error) => {
      logger.error(`MQTT client error (${client.id}): ${error.message}`);
    });
    
    // Handle published messages
    client.on('publish', (packet) => {
      this.handlePublish(client, packet);
    });
    
    // Handle subscriptions
    client.on('subscribe', (packet) => {
      this.handleSubscribe(client, packet);
    });
    
    // Handle unsubscriptions
    client.on('unsubscribe', (packet) => {
      this.handleUnsubscribe(client, packet);
    });
  }
  
  /**
   * Handle client connect
   * @param {Object} client - MQTT client
   * @param {Object} packet - Connect packet
   */
  async handleClientConnect(client, packet) {
    try {
      const { username, password } = packet;
      
      // Check if authentication is enabled
      if (config.features.mqtt.authentication.enabled) {
        const isAuthenticated = await this.authenticateClient(client, username, password);
        
        if (!isAuthenticated) {
          logger.warn(`Authentication failed (onHandleClientConnect) for client: ${client.id}`);
          client.connack({ returnCode: 4 }); // Bad username or password
          return;
        }
      }
      
      // Accept connection
      client.connack({ returnCode: 0 }); // Connection accepted
      logger.info(`MQTT client authenticated: ${client.id}`);
      
    } catch (error) {
      logger.error(`Error handling client connect: ${error.message}`);
      client.connack({ returnCode: 4 }); // Bad username or password
    }
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
      if (!username || !password) {
        return false;
      }
      
      // For token-based authentication, username is device UUID and password is token
      if (config.features.mqtt.authentication.tokenBased) {
        const deviceUuid = username;
        const token = password;
        
        // Find device token and join with sensor to check if sensor's uuid matches device uuid
        const deviceToken = await DeviceToken.findOne({
          where: { 
            token: token,
            status: 'active'
          },
          include: [{
            model: Sensor,
            where: { uuid: deviceUuid }
          }]
        });
        
        if (!deviceToken) {
          return false;
        }
        
        // Check if token is expired
        if (deviceToken.expiresAt && new Date() > deviceToken.expiresAt) {
          return false;
        }
        
        // Store authenticated client
        this.authenticatedClients.set(client.id, {
          deviceUuid,
          token,
          sensorId: deviceToken.sensorId,
          authenticatedAt: new Date()
        });
        
        return true;
      }
      
      // For username/password authentication
      // Add your custom authentication logic here
      return false;
      
    } catch (error) {
      logger.error(`Error authenticating client: ${error.message}`);
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
      
      logger.debug(`MQTT publish: ${topic} from ${client.id}`);
      
      // Check if client is authenticated
      if (config.features.mqtt.authentication.enabled) {
        const authInfo = this.authenticatedClients.get(client.id);
        if (!authInfo) {
          logger.warn(`Unauthenticated client ${client.id} attempted to publish to ${topic}`);
          return;
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
        logger.debug(`MQTT message processed successfully: ${topic}`);
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
      const { subscriptions } = packet;
      
      logger.debug(`MQTT subscribe from ${client.id}:`, subscriptions);
      
      // Check if client is authenticated
      if (config.features.mqtt.authentication.enabled) {
        const authInfo = this.authenticatedClients.get(client.id);
        if (!authInfo) {
          logger.warn(`Unauthenticated client ${client.id} attempted to subscribe`);
          return;
        }
      }
      
      // Accept subscriptions
      const granted = subscriptions.map(sub => ({
        topic: sub.topic,
        qos: Math.min(sub.qos, 2) // Ensure QoS doesn't exceed 2
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
      const { unsubscriptions } = packet;
      
      logger.debug(`MQTT unsubscribe from ${client.id}:`, unsubscriptions);
      
      // Accept unsubscriptions
      client.unsuback({ messageId: packet.messageId });
      
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
        logger.info('MQTT server stopped');
        this.isInitialized = false;
      });
    }
    if (this.aedes) {
      this.aedes.close(() => {
        logger.info('Aedes broker closed');
      });
    }
  }
}

module.exports = new MQTTService(); 