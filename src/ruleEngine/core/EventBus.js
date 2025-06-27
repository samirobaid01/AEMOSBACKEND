const EventEmitter = require('events');
const { EventTypes, EventPriority, EventSources } = require('../../events/EventTypes');
const logger = require('../../utils/logger');

/**
 * Central Event Bus for Rule Engine System
 * Handles all event emission, routing, and processing
 */
class RuleEngineEventBus extends EventEmitter {
  constructor() {
    super();
    
    // Set max listeners to handle many rule chains
    this.setMaxListeners(1000);
    
    // Event processing metrics
    this.metrics = {
      eventsProcessed: 0,
      eventsFailed: 0,
      averageProcessingTime: 0,
      eventsByType: new Map(),
      lastProcessedAt: null
    };
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Setup error handling
    this.setupErrorHandling();
    
    logger.info('RuleEngineEventBus initialized');
  }

  /**
   * Setup core event handlers for rule engine
   */
  setupEventHandlers() {
    // Telemetry Data Events
    this.on(EventTypes.TELEMETRY_DATA_RECEIVED, this.handleTelemetryData.bind(this));
    this.on(EventTypes.TELEMETRY_BATCH_RECEIVED, this.handleTelemetryBatch.bind(this));
    
    // Device State Events  
    this.on(EventTypes.DEVICE_STATE_CHANGED, this.handleDeviceStateChange.bind(this));
    this.on(EventTypes.DEVICE_CONNECTED, this.handleDeviceConnection.bind(this));
    this.on(EventTypes.DEVICE_DISCONNECTED, this.handleDeviceDisconnection.bind(this));
    
    // Scheduled Events
    this.on(EventTypes.SCHEDULE_TRIGGERED, this.handleScheduledEvent.bind(this));
    
    // External Events
    this.on(EventTypes.EXTERNAL_EVENT_RECEIVED, this.handleExternalEvent.bind(this));
    
    // Manual Triggers
    this.on(EventTypes.MANUAL_TRIGGER_REQUESTED, this.handleManualTrigger.bind(this));
    
    // Configuration Events
    this.on(EventTypes.RULE_CHAIN_UPDATED, this.handleRuleChainUpdated.bind(this));
    this.on(EventTypes.RULE_CHAIN_DELETED, this.handleRuleChainDeleted.bind(this));
    this.on(EventTypes.INDEX_REBUILD_REQUIRED, this.handleIndexRebuild.bind(this));
  }

  /**
   * Setup error handling for the event bus
   */
  setupErrorHandling() {
    this.on('error', (error) => {
      logger.error('RuleEngineEventBus error:', error);
      this.metrics.eventsFailed++;
    });
    
    // Handle uncaught exceptions in event handlers
    process.on('uncaughtException', (error) => {
      if (error.source === 'RuleEngineEventBus') {
        logger.error('Uncaught exception in RuleEngineEventBus:', error);
        this.metrics.eventsFailed++;
      }
    });
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} eventType 
   * @param {Object} eventData 
   */
  emitEvent(eventType, eventData) {
    const startTime = Date.now();
    
    // Get listener count using EventEmitter API
    const listenerCount = this.listenerCount(eventType);
    
    logger.info('🚀 DEBUG: EventBus emitting event', {
      eventType,
      hasListeners: listenerCount > 0,
      listenerCount: listenerCount,
      eventData: {
        sensorUuid: eventData.sensorUuid,
        organizationId: eventData.organizationId,
        variableName: eventData.variableName
      }
    });
    
    try {
      this.emit(eventType, eventData);
      
      // Update metrics
      this.updateMetrics(eventType, startTime, true);
      
      logger.info('✅ DEBUG: Event emitted successfully', {
        eventType,
        processingTime: Date.now() - startTime,
        listenerCount: listenerCount
      });
    } catch (error) {
      this.updateMetrics(eventType, startTime, false);
      logger.error('❌ DEBUG: Event emission failed', {
        eventType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle telemetry data received events
   */
  async handleTelemetryData(eventData) {
    try {
      logger.debug('Processing telemetry data event', {
        sensorUuid: eventData.sensorUuid,
        organizationId: eventData.organizationId
      });
      
      // Get rule engine manager (will be injected)
      if (this.ruleEngineManager) {
        await this.ruleEngineManager.processTelemetryEvent(eventData);
      }
    } catch (error) {
      logger.error('Error handling telemetry data:', error);
      this.emit('error', { ...error, source: 'RuleEngineEventBus', eventType: EventTypes.TELEMETRY_DATA_RECEIVED });
    }
  }

  /**
   * Handle batch telemetry events
   */
  async handleTelemetryBatch(eventData) {
    try {
      logger.debug('Processing telemetry batch event', {
        batchSize: eventData.telemetryData?.length || 0,
        organizationId: eventData.organizationId
      });
      
      if (this.ruleEngineManager) {
        await this.ruleEngineManager.processBatchTelemetryEvent(eventData);
      }
    } catch (error) {
      logger.error('Error handling telemetry batch:', error);
      this.emit('error', { ...error, source: 'RuleEngineEventBus', eventType: EventTypes.TELEMETRY_BATCH_RECEIVED });
    }
  }

  /**
   * Handle device state change events
   */
  async handleDeviceStateChange(eventData) {
    try {
      logger.debug('Processing device state change event', {
        deviceUuid: eventData.deviceUuid,
        stateName: eventData.stateName,
        organizationId: eventData.organizationId
      });
      
      if (this.ruleEngineManager) {
        await this.ruleEngineManager.processDeviceStateEvent(eventData);
      }
    } catch (error) {
      logger.error('Error handling device state change:', error);
      this.emit('error', { ...error, source: 'RuleEngineEventBus', eventType: EventTypes.DEVICE_STATE_CHANGED });
    }
  }

  /**
   * Handle device connection events
   */
  async handleDeviceConnection(eventData) {
    try {
      logger.debug('Processing device connection event', {
        deviceUuid: eventData.deviceUuid,
        organizationId: eventData.organizationId
      });
      
      if (this.ruleEngineManager) {
        await this.ruleEngineManager.processDeviceConnectionEvent(eventData);
      }
    } catch (error) {
      logger.error('Error handling device connection:', error);
      this.emit('error', { ...error, source: 'RuleEngineEventBus', eventType: EventTypes.DEVICE_CONNECTED });
    }
  }

  /**
   * Handle device disconnection events
   */
  async handleDeviceDisconnection(eventData) {
    try {
      logger.debug('Processing device disconnection event', {
        deviceUuid: eventData.deviceUuid,
        organizationId: eventData.organizationId
      });
      
      if (this.ruleEngineManager) {
        await this.ruleEngineManager.processDeviceDisconnectionEvent(eventData);
      }
    } catch (error) {
      logger.error('Error handling device disconnection:', error);
      this.emit('error', { ...error, source: 'RuleEngineEventBus', eventType: EventTypes.DEVICE_DISCONNECTED });
    }
  }

  /**
   * Handle scheduled events
   */
  async handleScheduledEvent(eventData) {
    try {
      logger.debug('Processing scheduled event', {
        cronExpression: eventData.cronExpression,
        organizationId: eventData.organizationId
      });
      
      if (this.ruleEngineManager) {
        await this.ruleEngineManager.processScheduledEvent(eventData);
      }
    } catch (error) {
      logger.error('Error handling scheduled event:', error);
      this.emit('error', { ...error, source: 'RuleEngineEventBus', eventType: EventTypes.SCHEDULE_TRIGGERED });
    }
  }

  /**
   * Handle external events
   */
  async handleExternalEvent(eventData) {
    try {
      logger.debug('Processing external event', {
        source: eventData.metadata?.source,
        organizationId: eventData.organizationId
      });
      
      if (this.ruleEngineManager) {
        await this.ruleEngineManager.processExternalEvent(eventData);
      }
    } catch (error) {
      logger.error('Error handling external event:', error);
      this.emit('error', { ...error, source: 'RuleEngineEventBus', eventType: EventTypes.EXTERNAL_EVENT_RECEIVED });
    }
  }

  /**
   * Handle manual trigger requests
   */
  async handleManualTrigger(eventData) {
    try {
      logger.debug('Processing manual trigger', {
        ruleChainId: eventData.ruleChainId,
        organizationId: eventData.organizationId,
        triggeredBy: eventData.triggeredBy
      });
      
      if (this.ruleEngineManager) {
        await this.ruleEngineManager.processManualTrigger(eventData);
      }
    } catch (error) {
      logger.error('Error handling manual trigger:', error);
      this.emit('error', { ...error, source: 'RuleEngineEventBus', eventType: EventTypes.MANUAL_TRIGGER_REQUESTED });
    }
  }

  /**
   * Handle rule chain configuration updates
   */
  async handleRuleChainUpdated(eventData) {
    try {
      logger.debug('Processing rule chain update', {
        ruleChainId: eventData.ruleChainId,
        organizationId: eventData.organizationId
      });
      
      // Trigger index rebuild for affected organization
      this.emitEvent(EventTypes.INDEX_REBUILD_REQUIRED, {
        organizationId: eventData.organizationId,
        reason: 'rule_chain_updated',
        ruleChainId: eventData.ruleChainId
      });
    } catch (error) {
      logger.error('Error handling rule chain update:', error);
    }
  }

  /**
   * Handle rule chain deletion
   */
  async handleRuleChainDeleted(eventData) {
    try {
      logger.debug('Processing rule chain deletion', {
        ruleChainId: eventData.ruleChainId,
        organizationId: eventData.organizationId
      });
      
      // Trigger index rebuild for affected organization
      this.emitEvent(EventTypes.INDEX_REBUILD_REQUIRED, {
        organizationId: eventData.organizationId,
        reason: 'rule_chain_deleted',
        ruleChainId: eventData.ruleChainId
      });
    } catch (error) {
      logger.error('Error handling rule chain deletion:', error);
    }
  }

  /**
   * Handle index rebuild requests
   */
  async handleIndexRebuild(eventData) {
    try {
      logger.info('Processing index rebuild request', {
        organizationId: eventData.organizationId,
        reason: eventData.reason
      });
      
      if (this.ruleEngineManager && this.ruleEngineManager.ruleChainIndex) {
        await this.ruleEngineManager.ruleChainIndex.rebuildIndex(eventData.organizationId);
      }
    } catch (error) {
      logger.error('Error handling index rebuild:', error);
    }
  }

  /**
   * Update processing metrics
   */
  updateMetrics(eventType, startTime, success) {
    this.metrics.eventsProcessed++;
    this.metrics.lastProcessedAt = new Date();
    
    if (!success) {
      this.metrics.eventsFailed++;
    }
    
    // Track by event type
    if (!this.metrics.eventsByType.has(eventType)) {
      this.metrics.eventsByType.set(eventType, { count: 0, avgTime: 0 });
    }
    
    const eventMetrics = this.metrics.eventsByType.get(eventType);
    eventMetrics.count++;
    
    // Calculate moving average processing time
    const processingTime = Date.now() - startTime;
    eventMetrics.avgTime = ((eventMetrics.avgTime * (eventMetrics.count - 1)) + processingTime) / eventMetrics.count;
    
    // Update overall average
    this.metrics.averageProcessingTime = ((this.metrics.averageProcessingTime * (this.metrics.eventsProcessed - 1)) + processingTime) / this.metrics.eventsProcessed;
  }

  /**
   * Set the rule engine manager dependency
   */
  setRuleEngineManager(ruleEngineManager) {
    this.ruleEngineManager = ruleEngineManager;
    logger.info('RuleEngineManager attached to EventBus');
  }

  /**
   * Get processing metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      eventsByType: Object.fromEntries(this.metrics.eventsByType)
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      eventsProcessed: 0,
      eventsFailed: 0,
      averageProcessingTime: 0,
      eventsByType: new Map(),
      lastProcessedAt: null
    };
    logger.info('EventBus metrics reset');
  }
}

// Create singleton instance only if rule engine is not disabled
let ruleEngineEventBus = null;

if (process.env.DISABLE_RULE_ENGINE !== 'true') {
  ruleEngineEventBus = new RuleEngineEventBus();
}

module.exports = {
  RuleEngineEventBus,
  ruleEngineEventBus
}; 