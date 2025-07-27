/**
 * Socket Notification Manager
 * Provides buffered and throttled socket notifications for datastream events
 */
const socketManager = require('./socketManager');
const logger = require('./logger');
const config = require('../config');
const mqttPublisher = require('../services/mqttPublisherService');

class NotificationManager {
  constructor(options = {}) {
    // Buffer for datastreams by telemetry ID
    this.dataBuffers = new Map();
    
    // Configuration
    this.broadcastInterval = options.broadcastInterval || config.features?.notifications?.broadcastInterval || 1000;
    this.maxBufferSize = options.maxBufferSize || config.features?.notifications?.bufferSize || 1000;
    this.debug = options.debug || false;
    
    // Set up interval for processing buffered notifications
    this.intervalId = setInterval(() => {
      this.processPendingNotifications();
    }, this.broadcastInterval);
    
    if (this.debug) {
      logger.info(`NotificationManager initialized with ${this.broadcastInterval}ms interval`);
    }
  }
  
  /**
   * Add datastream to the notification buffer
   * @param {Object} dataStream - DataStream object to notify about
   * @param {String} priority - 'high' for immediate, 'normal' for buffered
   * @param {Boolean} broadcastAll - Whether to broadcast to all clients or just to specific room
   */
  queueDataStreamNotification(dataStream, priority = 'normal', broadcastAll = false) {
    if (!dataStream || !dataStream.telemetryDataId) {
      logger.warn('Attempted to queue notification for invalid dataStream');
      return;
    }
    
    const telemetryId = dataStream.telemetryDataId;
    
    // For high priority, bypass buffer and send immediately
    if (priority === 'high') {
      this.sendImmediateNotification(dataStream, broadcastAll);
      return;
    }
    
    // Initialize buffer for this telemetry ID if needed
    if (!this.dataBuffers.has(telemetryId)) {
      this.dataBuffers.set(telemetryId, { items: [], broadcastAll });
    }
    
    // Add to buffer
    const buffer = this.dataBuffers.get(telemetryId);
    buffer.items.push(dataStream);
    
    // Update broadcastAll flag (if any item needs broadcastAll, the whole batch will use it)
    if (broadcastAll && !buffer.broadcastAll) {
      buffer.broadcastAll = true;
    }
    
    // Prevent buffer from growing too large
    if (buffer.items.length > this.maxBufferSize) {
      // Keep only most recent data
      buffer.items = buffer.items.slice(buffer.items.length - Math.floor(this.maxBufferSize / 2));
      
      if (this.debug) {
        logger.warn(`Buffer for telemetry ID ${telemetryId} exceeded max size, truncated`);
      }
    }
  }
  
  /**
   * Send immediate notification for critical data
   * @param {Object} dataStream - DataStream object to notify about
   * @param {Boolean} broadcastAll - Whether to broadcast to all clients
   */
  sendImmediateNotification(dataStream, broadcastAll = false) {
    try {
      const telemetryId = dataStream.telemetryDataId;
      
      // Send to specific telemetry room
      socketManager.broadcastToRoom(
        `telemetry-${telemetryId}`, 
        'new-datastream', 
        { dataStream, timestamp: new Date() }
      );
      
      // Also broadcast to general datastreams channel if broadcastAll is enabled
      if (broadcastAll) {
        socketManager.broadcastToAll('datastreams-update', {
          type: 'create',
          dataStream,
          timestamp: new Date()
        });
      }
      
      if (this.debug) {
        logger.debug(`Immediate notification sent for telemetry ID ${telemetryId}${broadcastAll ? ' (with global broadcast)' : ''}`);
      }
    } catch (error) {
      logger.error('Error sending immediate notification', error);
    }
  }
  
  /**
   * Process all buffered notifications at interval
   */
  processPendingNotifications() {
    for (const [telemetryId, buffer] of this.dataBuffers.entries()) {
      const items = buffer.items || [];
      const broadcastAll = buffer.broadcastAll || false;
      
      if (items.length === 0) {
        continue;
      }
      
      try {
        // For small buffers (1-2 items), just send the items directly
        if (items.length <= 2) {
          items.forEach(dataStream => {
            socketManager.broadcastToRoom(
              `telemetry-${telemetryId}`, 
              'new-datastream', 
              { dataStream, timestamp: new Date() }
            );
          });
        } 
        // For larger buffers, send aggregated data
        else {
          const numericValues = items
            .map(d => parseFloat(d.value))
            .filter(v => !isNaN(v));
            
          const aggregatedData = {
            telemetryDataId: telemetryId,
            count: items.length,
            latest: items[items.length - 1],
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            avg: numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length,
            timestamp: new Date()
          };
          
          // Send aggregated data to specific room
          socketManager.broadcastToRoom(
            `telemetry-${telemetryId}`, 
            'datastream-batch', 
            aggregatedData
          );
          
          // Send simplified update to all clients if broadcastAll is enabled
          if (broadcastAll) {
            socketManager.broadcastToAll('datastreams-update', {
              type: 'batch',
              telemetryDataId: telemetryId,
              count: items.length,
              timestamp: new Date()
            });
          }
        }
        
        if (this.debug && items.length > 0) {
          logger.debug(`Processed ${items.length} notifications for telemetry ID ${telemetryId}${broadcastAll ? ' (with global broadcast)' : ''}`);
        }
        
        // Clear buffer after processing
        this.dataBuffers.set(telemetryId, { items: [], broadcastAll });
      } catch (error) {
        logger.error(`Error processing notifications for telemetry ID ${telemetryId}`, error);
      }
    }
  }
  
  /**
   * Stop the notification manager and clear resources
   */
  shutdown() {
    clearInterval(this.intervalId);
    this.dataBuffers.clear();
    logger.info('NotificationManager shut down');
  }

  determineStatePriority(metadata) {
    // Rules for priority:
    // - Critical devices always high priority
    // - Certain state changes might be high priority
    return (
      metadata.isCritical ||
      this.isHighPriorityState(metadata.stateName) ||
      this.isSignificantChange(metadata.oldValue, metadata.newValue)
    );
  }

  isHighPriorityState(stateName) {
    const highPriorityStates = ['error', 'fault', 'alarm', 'emergency', 'critical'];
    return highPriorityStates.some(state => 
      stateName.toLowerCase().includes(state.toLowerCase())
    );
  }

  isSignificantChange(oldValue, newValue) {
    // If either value is null, consider it significant
    if (oldValue === null || newValue === null) return true;

    // For boolean values
    if (typeof oldValue === 'boolean' || typeof newValue === 'boolean') {
      return oldValue !== newValue;
    }

    // For numeric values, check if change is more than 50%
    const numOld = parseFloat(oldValue);
    const numNew = parseFloat(newValue);
    if (!isNaN(numOld) && !isNaN(numNew) && numOld !== 0) {
      return Math.abs((numNew - numOld) / numOld) > 0.5;
    }

    // For other types, any change is significant
    return oldValue !== newValue;
  }

  queueStateChangeNotification(metadata, priority = null, broadcastAll = false) {
    try {
      // Determine priority if not provided
      if (priority === null) {
        priority = this.determineStatePriority(metadata) ? 'high' : 'normal';
      }

      const notification = {
        title: `Device State Change: ${metadata.deviceName}`,
        message: `State '${metadata.stateName}' changed from '${metadata.oldValue || 'undefined'}' to '${metadata.newValue}'`,
        type: 'state_change',
        deviceType: metadata.deviceType,
        deviceId: metadata.deviceId,
        deviceUuid: metadata.deviceUuid,
        priority,
        timestamp: new Date(),
        metadata
      };

      // Emit via WebSocket
      if (broadcastAll) {
        // Broadcast to all connected clients
        socketManager.broadcastToAll('device-state-change', notification);
      } else {
        // Emit to specific device room using UUID
        socketManager.broadcastToRoom(`device-uuid-${metadata.deviceUuid}`, 'device-state-change', notification);
        
        // Also emit to room with device ID for backward compatibility
        socketManager.broadcastToRoom(`device-${metadata.deviceId}`, 'device-state-change', notification);
      }

      // 🎯 Publish to MQTT as well
      process.nextTick(async () => {
        try {
          await mqttPublisher.publishDeviceStateChange(metadata);
          logger.debug(`Device state change published to MQTT for device ${metadata.deviceUuid}`);
        } catch (error) {
          logger.error(`Failed to publish device state change to MQTT: ${error.message}`);
        }
      });

      // Log high priority notifications
      if (priority === 'high') {
        logger.info('High priority state change:', notification);
      }

      return notification;
    } catch (error) {
      logger.error('Error in queueStateChangeNotification:', error);
      return null;
    }
  }
}

// Create singleton instance
const notificationManager = new NotificationManager({
  debug: process.env.NODE_ENV === 'development'
});

module.exports = notificationManager; 