const logger = require('../../utils/logger');

/**
 * Event Processor - Handles intelligent event routing and processing
 * Determines which events should trigger which processing pipelines
 */
class EventProcessor {
  constructor(ruleChainIndex) {
    this.ruleChainIndex = ruleChainIndex;
    this.processingStats = {
      totalProcessed: 0,
      byEventType: new Map(),
      lastProcessedAt: null
    };
    
    logger.info('EventProcessor initialized');
  }

  /**
   * Process telemetry event and determine execution strategy
   * @param {Object} eventData 
   */
  async processTelemetryEvent(eventData) {
    const startTime = Date.now();
    
    try {
      const { sensorUuid, organizationId, variableName, value, datatype } = eventData;
      
      // Find relevant rule chains
      const relevantRuleChains = await this.ruleChainIndex.findBySensorUuid(sensorUuid, organizationId);
      
      // Prepare execution context
      const executionContext = {
        eventType: 'telemetry',
        relevantRuleChains,
        executionData: {
          sensorData: [{
            UUID: sensorUuid,
            [variableName]: this._convertValue(value, datatype),
            timestamp: eventData.timestamp
          }],
          deviceData: []
        },
        metadata: {
          ...eventData.metadata,
          processingStartTime: startTime,
          relevantRuleChainsCount: relevantRuleChains.length
        }
      };
      
      this._updateStats('telemetry', startTime);
      
      return executionContext;
    } catch (error) {
      logger.error('Error processing telemetry event:', error);
      throw error;
    }
  }

  /**
   * Process batch telemetry events with optimization
   * @param {Object} eventData 
   */
  async processBatchTelemetryEvent(eventData) {
    const startTime = Date.now();
    
    try {
      const { telemetryData, organizationId } = eventData;
      
      // Optimize by grouping sensors by affected rule chains
      const ruleChainToSensors = new Map();
      const sensorDataMap = new Map();
      
      // Process each item and group by rule chains
      for (const item of telemetryData) {
        const { sensorUuid, variableName, value, datatype } = item;
        
        // Find relevant rule chains for this sensor
        const relevantRuleChains = await this.ruleChainIndex.findBySensorUuid(sensorUuid, organizationId);
        
        // Group sensors by rule chains they affect
        for (const ruleChainId of relevantRuleChains) {
          if (!ruleChainToSensors.has(ruleChainId)) {
            ruleChainToSensors.set(ruleChainId, new Set());
          }
          ruleChainToSensors.get(ruleChainId).add(sensorUuid);
        }
        
        // Build sensor data map
        if (!sensorDataMap.has(sensorUuid)) {
          sensorDataMap.set(sensorUuid, { UUID: sensorUuid, timestamp: item.timestamp });
        }
        sensorDataMap.get(sensorUuid)[variableName] = this._convertValue(value, datatype);
      }
      
      // Create execution context
      const executionContext = {
        eventType: 'batch_telemetry',
        relevantRuleChains: Array.from(ruleChainToSensors.keys()),
        executionData: {
          sensorData: Array.from(sensorDataMap.values()),
          deviceData: []
        },
        metadata: {
          ...eventData.metadata,
          processingStartTime: startTime,
          batchSize: telemetryData.length,
          affectedRuleChains: ruleChainToSensors.size,
          optimizationApplied: true
        }
      };
      
      this._updateStats('batch_telemetry', startTime);
      
      return executionContext;
    } catch (error) {
      logger.error('Error processing batch telemetry event:', error);
      throw error;
    }
  }

  /**
   * Process device state change event
   * @param {Object} eventData 
   */
  async processDeviceStateEvent(eventData) {
    const startTime = Date.now();
    
    try {
      const { deviceUuid, stateName, value, organizationId } = eventData;
      
      // Find relevant rule chains
      const relevantRuleChains = await this.ruleChainIndex.findByDeviceUuid(deviceUuid, organizationId);
      
      // Create execution context
      const executionContext = {
        eventType: 'device_state',
        relevantRuleChains,
        executionData: {
          sensorData: [],
          deviceData: [{
            UUID: deviceUuid,
            [stateName]: value,
            timestamp: eventData.timestamp
          }]
        },
        metadata: {
          ...eventData.metadata,
          processingStartTime: startTime,
          relevantRuleChainsCount: relevantRuleChains.length
        }
      };
      
      this._updateStats('device_state', startTime);
      
      return executionContext;
    } catch (error) {
      logger.error('Error processing device state event:', error);
      throw error;
    }
  }

  /**
   * Process manual trigger event
   * @param {Object} eventData 
   */
  async processManualTrigger(eventData) {
    const startTime = Date.now();
    
    try {
      const { organizationId, ruleChainId } = eventData;
      
      // Find rule chains to execute
      const relevantRuleChains = await this.ruleChainIndex.findForManualTrigger(organizationId, ruleChainId);
      
      // For manual triggers, we need to collect all required data
      const executionContext = {
        eventType: 'manual_trigger',
        relevantRuleChains,
        executionData: {
          sensorData: [],
          deviceData: []
        },
        metadata: {
          ...eventData.metadata,
          processingStartTime: startTime,
          relevantRuleChainsCount: relevantRuleChains.length,
          requiresDataCollection: true
        }
      };
      
      this._updateStats('manual_trigger', startTime);
      
      return executionContext;
    } catch (error) {
      logger.error('Error processing manual trigger:', error);
      throw error;
    }
  }

  /**
   * Determine execution priority based on event characteristics
   * @param {Object} executionContext 
   */
  determineExecutionPriority(executionContext) {
    const { metadata, relevantRuleChains } = executionContext;
    
    // Priority factors
    let priority = 0;
    
    // Urgent events get highest priority
    if (metadata.urgent) priority += 100;
    
    // High priority metadata
    if (metadata.priority === 'critical') priority += 80;
    else if (metadata.priority === 'high') priority += 60;
    else if (metadata.priority === 'normal') priority += 40;
    else priority += 20;
    
    // Number of affected rule chains
    priority += Math.min(relevantRuleChains.length * 5, 50);
    
    // Event type priority
    switch (executionContext.eventType) {
      case 'telemetry':
        priority += 30;
        break;
      case 'device_state':
        priority += 40;
        break;
      case 'batch_telemetry':
        priority += 20;
        break;
      case 'manual_trigger':
        priority += 10;
        break;
    }
    
    return Math.min(priority, 255); // Cap at 255
  }

  /**
   * Convert value based on datatype
   * @param {any} value 
   * @param {string} datatype 
   */
  _convertValue(value, datatype) {
    switch (datatype) {
      case 'number':
        return Number(value);
      case 'boolean':
        return String(value).toLowerCase() === 'true';
      default:
        return value;
    }
  }

  /**
   * Update processing statistics
   * @param {string} eventType 
   * @param {number} startTime 
   */
  _updateStats(eventType, startTime) {
    this.processingStats.totalProcessed++;
    this.processingStats.lastProcessedAt = new Date();
    
    if (!this.processingStats.byEventType.has(eventType)) {
      this.processingStats.byEventType.set(eventType, {
        count: 0,
        totalTime: 0,
        avgTime: 0
      });
    }
    
    const stats = this.processingStats.byEventType.get(eventType);
    stats.count++;
    
    const processingTime = Date.now() - startTime;
    stats.totalTime += processingTime;
    stats.avgTime = stats.totalTime / stats.count;
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      ...this.processingStats,
      byEventType: Object.fromEntries(this.processingStats.byEventType)
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.processingStats = {
      totalProcessed: 0,
      byEventType: new Map(),
      lastProcessedAt: null
    };
  }
}

module.exports = EventProcessor; 