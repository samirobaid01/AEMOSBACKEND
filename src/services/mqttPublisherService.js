/**
 * MQTT Publisher Service for publishing events to MQTT topics
 */
const logger = require('../utils/logger');
const config = require('../config/features');

class MQTTPublisherService {
  constructor() {
    this.mqttClient = null;
    this.isConnected = false;
    this.publishQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Initialize MQTT publisher client
   */
  async initialize() {
    if (!config.mqtt.enabled) {
      logger.info('MQTT publisher not enabled');
      return;
    }

    try {
      const mqtt = require('mqtt');
      
      // Create MQTT client for publishing
      this.mqttClient = mqtt.connect(`mqtt://${config.mqtt.host}:${config.mqtt.port}`, {
        clientId: `aemos-publisher-${Date.now()}`,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
        keepalive: 60,
        username: 'publisher',
        password: 'publisher-secret'
      });

      this.mqttClient.on('connect', () => {
        this.isConnected = true;
        logger.info('MQTT publisher connected');
        
        // Process queued messages
        this.processQueue();
      });

      this.mqttClient.on('error', (error) => {
        logger.error('MQTT publisher error:', error);
        this.isConnected = false;
      });

      this.mqttClient.on('close', () => {
        logger.warn('MQTT publisher disconnected');
        this.isConnected = false;
      });

      this.mqttClient.on('reconnect', () => {
        logger.info('MQTT publisher reconnecting...');
      });

    } catch (error) {
      logger.error('Failed to initialize MQTT publisher:', error);
    }
  }

  /**
   * Publish device state change to MQTT
   * @param {Object} metadata - Device state change metadata
   * @param {string} topic - Optional custom topic
   */
  async publishDeviceStateChange(metadata, topic = null) {
    if (!config.mqtt.enabled) {
      return;
    }

    const message = {
      type: 'device_state_change',
      deviceUuid: metadata.deviceUuid,
      deviceName: metadata.deviceName,
      deviceType: metadata.deviceType,
      stateName: metadata.stateName,
      oldValue: metadata.oldValue,
      newValue: metadata.newValue,
      initiatedBy: metadata.initiatedBy,
      timestamp: new Date().toISOString(),
      priority: metadata.priority || 'normal',
      metadata: {
        deviceId: metadata.deviceId,
        isCritical: metadata.isCritical,
        initiatorId: metadata.initiatorId
      }
    };

    // Use custom topic or default topic
    const mqttTopic = topic || `devices/${metadata.deviceUuid}/state`;
    
    await this.publish(mqttTopic, message, { qos: 1, retain: false });
  }

  /**
   * Publish data stream to MQTT
   * @param {Object} dataStream - Data stream object
   * @param {string} deviceUuid - Device UUID
   */
  async publishDataStream(dataStream, deviceUuid) {
    if (!config.mqtt.enabled) {
      return;
    }

    const message = {
      type: 'data_stream',
      deviceUuid: deviceUuid,
      telemetryDataId: dataStream.telemetryDataId,
      value: dataStream.value,
      timestamp: dataStream.recievedAt.toISOString(),
      metadata: {
        id: dataStream.id
      }
    };

    const topic = `devices/${deviceUuid}/datastream`;
    await this.publish(topic, message, { qos: 1, retain: false });
  }

  /**
   * Publish command to MQTT
   * @param {Object} command - Command object
   * @param {string} deviceUuid - Device UUID
   */
  async publishCommand(command, deviceUuid) {
    if (!config.mqtt.enabled) {
      return;
    }

    const message = {
      type: 'command',
      deviceUuid: deviceUuid,
      command: command,
      timestamp: new Date().toISOString(),
      metadata: {
        initiatedBy: command.initiatedBy || 'system'
      }
    };

    const topic = `devices/${deviceUuid}/commands`;
    await this.publish(topic, message, { qos: 2, retain: false });
  }

  /**
   * Publish broadcast message to MQTT
   * @param {Object} message - Message object
   * @param {string} organizationId - Organization ID
   */
  async publishBroadcast(message, organizationId) {
    if (!config.mqtt.enabled) {
      return;
    }

    const broadcastMessage = {
      type: 'broadcast',
      organizationId: organizationId,
      message: message,
      timestamp: new Date().toISOString()
    };

    const topic = `organizations/${organizationId}/broadcast`;
    await this.publish(topic, broadcastMessage, { qos: 1, retain: false });
  }

  /**
   * Publish rule chain execution result to MQTT
   * @param {Object} result - Rule chain execution result
   * @param {string} organizationId - Organization ID
   */
  async publishRuleChainResult(result, organizationId) {
    if (!config.mqtt.enabled) {
      return;
    }

    const message = {
      type: 'rule_chain_execution',
      organizationId: organizationId,
      ruleChainId: result.ruleChainId,
      ruleChainName: result.name,
      status: result.status,
      summary: result.summary,
      timestamp: new Date().toISOString(),
      metadata: {
        executedNodes: result.executionDetails?.executedNodes?.length || 0,
        actionsExecuted: result.summary?.actionsExecuted || 0
      }
    };

    const topic = `organizations/${organizationId}/rule-chains`;
    await this.publish(topic, message, { qos: 1, retain: false });
  }

  /**
   * Generic publish method with retry logic
   * @param {string} topic - MQTT topic
   * @param {Object} message - Message to publish
   * @param {Object} options - Publish options
   */
  async publish(topic, message, options = {}) {
    if (!config.mqtt.enabled) {
      return;
    }

    const defaultOptions = {
      qos: 1,
      retain: false
    };

    const publishOptions = { ...defaultOptions, ...options };

    // If not connected, queue the message
    if (!this.isConnected || !this.mqttClient) {
      this.publishQueue.push({ topic, message, options: publishOptions });
      logger.debug(`Message queued for topic ${topic} (client not connected)`);
      return;
    }

    try {
      const payload = JSON.stringify(message);
      
      this.mqttClient.publish(topic, payload, publishOptions, (error) => {
        if (error) {
          logger.error(`Failed to publish to ${topic}:`, error);
          // Queue for retry
          this.publishQueue.push({ topic, message, options: publishOptions, retries: 0 });
        } else {
          logger.debug(`Published to ${topic}: ${payload.substring(0, 100)}...`);
        }
      });

    } catch (error) {
      logger.error(`Error publishing to ${topic}:`, error);
      // Queue for retry
      this.publishQueue.push({ topic, message, options: publishOptions, retries: 0 });
    }
  }

  /**
   * Process queued messages
   */
  processQueue() {
    if (!this.isConnected || this.publishQueue.length === 0) {
      return;
    }

    const queue = [...this.publishQueue];
    this.publishQueue = [];

    queue.forEach(async (item) => {
      try {
        await this.publish(item.topic, item.message, item.options);
      } catch (error) {
        logger.error(`Failed to process queued message for ${item.topic}:`, error);
        
        // Retry logic
        if (item.retries < this.maxRetries) {
          item.retries = (item.retries || 0) + 1;
          setTimeout(() => {
            this.publishQueue.push(item);
          }, this.retryDelay * item.retries);
        }
      }
    });

    logger.debug(`Processed ${queue.length} queued messages`);
  }

  /**
   * Shutdown MQTT publisher
   */
  shutdown() {
    if (this.mqttClient) {
      this.mqttClient.end();
      this.mqttClient = null;
    }
    this.isConnected = false;
    this.publishQueue = [];
    logger.info('MQTT publisher shut down');
  }
}

module.exports = new MQTTPublisherService(); 