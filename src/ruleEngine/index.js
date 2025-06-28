const { ruleEngineEventBus } = require('./core/EventBus');
const RuleEngineManager = require('./core/RuleEngineManager');
const { EventTypes, EventPriority, EventSources } = require('../events/EventTypes');
const logger = require('../utils/logger');
const { CircuitBreaker } = require('./utils/CircuitBreaker');
const RuleChainIndex = require('./indexing/RuleChainIndex');
const ScheduleManager = require('./scheduling/ScheduleManager');

/**
 * Rule Engine Initialization and Management
 * Main entry point for the new rule engine system
 */
class RuleEngine {
  constructor() {
    this.eventBus = ruleEngineEventBus;
    this.manager = null;
    this.ruleChainIndex = null;
    this.circuitBreaker = null;
    this.scheduleManager = null;
    this.isInitialized = false;
    
    logger.info('RuleEngine created');
  }

  /**
   * Initialize the rule engine system
   * Call this after database connection is established
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Rule engine already initialized');
      return;
    }

    try {
      logger.info('🚀 DEBUG: Initializing Rule Engine System...');
      
      // Initialize circuit breaker
      this.circuitBreaker = new CircuitBreaker({
        name: 'RuleEngineCircuitBreaker',
        failureThreshold: 5,
        recoveryTimeout: 60000
      });
      
      logger.info('🛡️ DEBUG: Circuit breaker initialized');

      // Initialize index (with timeout to prevent hanging)
      logger.info('📊 DEBUG: Initializing rule chain index...');
      const indexPromise = this._initializeIndexWithTimeout();
      this.ruleChainIndex = await indexPromise;
      
      logger.info('📊 DEBUG: Rule chain index initialized');

      // Use the existing singleton event bus
      logger.info('📡 DEBUG: Using existing event bus instance');

      // Initialize manager with dependencies
      this.manager = new RuleEngineManager(
        this.eventBus,
        this.ruleChainIndex,
        this.circuitBreaker
      );
      
      logger.info('🎛️ DEBUG: Rule engine manager initialized');

      // Initialize enhanced schedule manager with database integration
      logger.info('📅 DEBUG: Initializing enhanced schedule manager with database integration...');
      
      // Import ruleChainService for database integration
      let ruleChainService = null;
      try {
        const ruleChainServiceModule = require('../services/ruleChainService');
        ruleChainService = ruleChainServiceModule.ruleChainService;
        logger.info('🗄️ DEBUG: RuleChainService loaded for schedule manager');
      } catch (error) {
        logger.warn('⚠️ DEBUG: Could not load ruleChainService, schedule manager will work in memory-only mode:', error.message);
      }
      
      this.scheduleManager = new ScheduleManager(this.eventBus, ruleChainService);
      
      // Initialize the schedule manager (loads database schedules)
      await this.scheduleManager.initialize();
      
      logger.info('📅 DEBUG: Enhanced schedule manager initialized');

      // Set up event listeners with error handling
      this._setupEventListeners();
      
      logger.info('✅ DEBUG: Event listeners set up successfully');
      
      this.isInitialized = true;
      logger.info('🎉 DEBUG: Rule Engine System initialized successfully!');
      
      return {
        status: 'initialized',
        components: {
          eventBus: !!this.eventBus,
          ruleChainIndex: !!this.ruleChainIndex,
          ruleEngineManager: !!this.manager,
          circuitBreaker: !!this.circuitBreaker,
          scheduleManager: !!this.scheduleManager,
          databaseIntegration: !!ruleChainService
        }
      };
    } catch (error) {
      logger.error('❌ DEBUG: Failed to initialize rule engine:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Initialize rule chain index with timeout to prevent hanging
   */
  async _initializeIndexWithTimeout() {
    const timeout = 10000; // 10 second timeout
    
    logger.info('🕐 DEBUG: Starting index initialization with timeout...');
    
    let timeoutHandle;
    
    try {
      const result = await Promise.race([
        new Promise(async (resolve, reject) => {
          try {
            logger.info('🏗️ DEBUG: Creating RuleChainIndex instance...');
            const index = new RuleChainIndex();
            
            logger.info('🚀 DEBUG: Calling index.initialize()...');
            await index.initialize();
            
            logger.info('✅ DEBUG: Index initialization completed successfully');
            resolve(index);
          } catch (error) {
            logger.error('❌ DEBUG: Index initialization failed:', error);
            reject(error);
          }
        }),
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => {
            logger.error('⏰ DEBUG: Index initialization timed out after 10 seconds');
            reject(new Error('Rule chain index initialization timed out'));
          }, timeout);
        })
      ]);
      
      // Clear the timeout if we get here (successful completion)
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      
      return result;
    } catch (error) {
      // Clear the timeout on error as well
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      throw error;
    }
  }

  /**
   * Setup event listeners with error handling
   */
  _setupEventListeners() {
    logger.info('🔧 DEBUG: Setting up event listeners...');
    
    try {
      this.eventBus.on(EventTypes.TELEMETRY_DATA_RECEIVED, async (eventData) => {
        try {
          logger.info('📊 DEBUG: Received TELEMETRY_DATA_RECEIVED event', {
            sensorUuid: eventData.sensorUuid,
            organizationId: eventData.organizationId,
            variableName: eventData.variableName
          });
          await this.manager.processTelemetryEvent(eventData);
        } catch (error) {
          logger.error('Error processing telemetry event:', error);
        }
      });

      this.eventBus.on(EventTypes.DEVICE_STATE_CHANGED, async (eventData) => {
        try {
          logger.info('🔌 DEBUG: Received DEVICE_STATE_CHANGED event', {
            deviceUuid: eventData.deviceUuid,
            organizationId: eventData.organizationId
          });
          await this.manager.processDeviceStateEvent(eventData);
        } catch (error) {
          logger.error('Error processing device state event:', error);
        }
      });

      this.eventBus.on(EventTypes.MANUAL_TRIGGER_REQUESTED, async (eventData) => {
        try {
          logger.info('👆 DEBUG: Received MANUAL_TRIGGER_REQUESTED event', {
            organizationId: eventData.organizationId,
            ruleChainId: eventData.ruleChainId
          });
          await this.manager.processManualTrigger(eventData);
        } catch (error) {
          logger.error('Error processing manual trigger:', error);
        }
      });

      this.eventBus.on(EventTypes.TELEMETRY_BATCH_RECEIVED, async (eventData) => {
        try {
          logger.info('📦 DEBUG: Received TELEMETRY_BATCH_RECEIVED event', {
            organizationId: eventData.organizationId,
            batchSize: eventData.telemetryData?.length
          });
          await this.manager.processBatchTelemetryEvent(eventData);
        } catch (error) {
          logger.error('Error processing batch telemetry event:', error);
        }
      });

      this.eventBus.on(EventTypes.SCHEDULE_TRIGGERED, async (eventData) => {
        try {
          logger.info('⏰ DEBUG: Received SCHEDULE_TRIGGERED event', {
            scheduleName: eventData.scheduleName,
            cronExpression: eventData.cronExpression,
            organizationId: eventData.organizationId
          });
          await this.manager.processScheduledEvent(eventData);
        } catch (error) {
          logger.error('Error processing scheduled event:', error);
        }
      });
    } catch (error) {
      logger.error('Error setting up event listeners:', error);
      throw error;
    }
  }

  /**
   * Emit a telemetry data event
   * @param {Object} eventData 
   */
  emitTelemetryEvent(eventData) {
    this._ensureInitialized();
    
    return this.eventBus.emitEvent(EventTypes.TELEMETRY_DATA_RECEIVED, eventData);
  }

  /**
   * Emit a batch telemetry event
   * @param {Object} eventData 
   */
  emitBatchTelemetryEvent(eventData) {
    this._ensureInitialized();
    
    return this.eventBus.emitEvent(EventTypes.TELEMETRY_BATCH_RECEIVED, eventData);
  }

  /**
   * Emit a device state change event
   * @param {Object} eventData 
   */
  emitDeviceStateEvent(eventData) {
    this._ensureInitialized();
    
    return this.eventBus.emitEvent(EventTypes.DEVICE_STATE_CHANGED, eventData);
  }

  /**
   * Emit a device connection event
   * @param {Object} eventData 
   */
  emitDeviceConnectionEvent(eventData) {
    this._ensureInitialized();
    
    return this.eventBus.emitEvent(EventTypes.DEVICE_CONNECTED, eventData);
  }

  /**
   * Emit a device disconnection event
   * @param {Object} eventData 
   */
  emitDeviceDisconnectionEvent(eventData) {
    this._ensureInitialized();
    
    return this.eventBus.emitEvent(EventTypes.DEVICE_DISCONNECTED, eventData);
  }

  /**
   * Emit a scheduled event
   * @param {Object} eventData 
   */
  emitScheduledEvent(eventData) {
    this._ensureInitialized();
    
    return this.eventBus.emitEvent(EventTypes.SCHEDULE_TRIGGERED, eventData);
  }

  /**
   * Emit a manual trigger event
   * @param {Object} eventData 
   */
  emitManualTrigger(eventData) {
    this._ensureInitialized();
    
    return this.eventBus.emitEvent(EventTypes.MANUAL_TRIGGER_REQUESTED, eventData);
  }

  /**
   * Emit an external event
   * @param {Object} eventData 
   */
  emitExternalEvent(eventData) {
    this._ensureInitialized();
    
    return this.eventBus.emitEvent(EventTypes.EXTERNAL_EVENT_RECEIVED, eventData);
  }

  /**
   * Emit rule chain configuration update event
   * @param {Object} eventData 
   */
  emitRuleChainUpdated(eventData) {
    this._ensureInitialized();
    
    return this.eventBus.emitEvent(EventTypes.RULE_CHAIN_UPDATED, eventData);
  }

  /**
   * Emit rule chain deletion event
   * @param {Object} eventData 
   */
  emitRuleChainDeleted(eventData) {
    this._ensureInitialized();
    
    return this.eventBus.emitEvent(EventTypes.RULE_CHAIN_DELETED, eventData);
  }

  /**
   * Get rule engine metrics
   */
  getMetrics() {
    this._ensureInitialized();
    
    return {
      eventBus: this.eventBus.getMetrics(),
      manager: this.manager.getMetrics()
    };
  }

  /**
   * Get index statistics for an organization
   * @param {number} organizationId 
   */
  getIndexStats(organizationId) {
    this._ensureInitialized();
    
    return this.manager.getIndexStats(organizationId);
  }

  /**
   * Manually rebuild index for an organization
   * @param {number} organizationId 
   */
  async rebuildIndex(organizationId) {
    this._ensureInitialized();
    
    return this.manager.rebuildIndex(organizationId);
  }

  /**
   * Check if rule engine is healthy
   */
  getHealthStatus() {
    return {
      initialized: this.isInitialized,
      eventBusListeners: this.eventBus.listenerCount(),
      scheduleManager: this.scheduleManager ? {
        totalSchedules: this.scheduleManager.getStats().totalSchedules,
        activeSchedules: this.scheduleManager.getStats().activeSchedules
      } : null,
      metrics: this.isInitialized ? this.getMetrics() : null
    };
  }

  /**
   * Reset all metrics and state (useful for testing)
   */
  reset() {
    if (this.isInitialized) {
      this.eventBus.resetMetrics();
      this.manager.resetMetrics();
      this.manager.ruleChainIndex.clearAll();
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down Rule Engine...');
      
      // Stop all schedules
      if (this.scheduleManager) {
        this.scheduleManager.stopAll();
      }
      
      // Remove all listeners
      this.eventBus.removeAllListeners();
      
      // Clear all indexes and cache
      if (this.manager && this.manager.ruleChainIndex) {
        this.manager.ruleChainIndex.clearAll();
      }
      
      this.isInitialized = false;
      
      logger.info('Rule Engine shut down successfully');
    } catch (error) {
      logger.error('Error during Rule Engine shutdown:', error);
      throw error;
    }
  }

  /**
   * Pre-build indexes for existing organizations (optimization)
   */
  async _prebuildIndexes() {
    try {
      // This could query all organizations and build indexes
      // For now, we'll build indexes on-demand
      logger.info('Index pre-building skipped - will build on-demand');
    } catch (error) {
      logger.warn('Failed to pre-build indexes:', error);
      // Don't fail initialization for this
    }
  }

  /**
   * Ensure rule engine is initialized
   */
  _ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('Rule Engine not initialized. Call initialize() first.');
    }
  }

  // ========== SCHEDULE MANAGEMENT METHODS ==========

  /**
   * Add a new schedule (legacy method for backward compatibility)
   * @param {Object} scheduleConfig 
   */
  addSchedule(scheduleConfig) {
    this._ensureInitialized();
    
    return this.scheduleManager.addSchedule(scheduleConfig);
  }

  /**
   * Add a new database-backed schedule for a rule chain
   * @param {number} ruleChainId - Rule chain ID
   * @param {Object} scheduleConfig - Schedule configuration
   */
  async addDatabaseSchedule(ruleChainId, scheduleConfig) {
    this._ensureInitialized();
    
    return this.scheduleManager.addDatabaseSchedule(ruleChainId, scheduleConfig);
  }

  /**
   * Remove a schedule (handles both legacy and database schedules)
   * @param {string|number} scheduleId 
   */
  async removeSchedule(scheduleId) {
    this._ensureInitialized();
    
    return this.scheduleManager.removeSchedule(scheduleId);
  }

  /**
   * Remove a database-backed schedule
   * @param {number} ruleChainId - Rule chain ID
   */
  async removeDatabaseSchedule(ruleChainId) {
    this._ensureInitialized();
    
    return this.scheduleManager.removeDatabaseSchedule(ruleChainId);
  }

  /**
   * Enable a schedule (handles both legacy and database schedules)
   * @param {string|number} scheduleId 
   */
  async enableSchedule(scheduleId) {
    this._ensureInitialized();
    
    return this.scheduleManager.enableSchedule(scheduleId);
  }

  /**
   * Disable a schedule (handles both legacy and database schedules)
   * @param {string|number} scheduleId 
   */
  async disableSchedule(scheduleId) {
    this._ensureInitialized();
    
    return this.scheduleManager.disableSchedule(scheduleId);
  }

  /**
   * Update a schedule (handles both legacy and database schedules)
   * @param {string|number} scheduleId 
   * @param {Object} updates 
   */
  async updateSchedule(scheduleId, updates) {
    this._ensureInitialized();
    
    return this.scheduleManager.updateSchedule(scheduleId, updates);
  }

  /**
   * Update a database-backed schedule
   * @param {number} ruleChainId - Rule chain ID
   * @param {Object} updates - Updates to apply
   */
  async updateDatabaseSchedule(ruleChainId, updates) {
    this._ensureInitialized();
    
    return this.scheduleManager.updateDatabaseSchedule(ruleChainId, updates);
  }

  /**
   * Sync schedule from database (handle external changes)
   * @param {number} ruleChainId - Rule chain ID
   */
  async syncScheduleFromDatabase(ruleChainId) {
    this._ensureInitialized();
    
    return this.scheduleManager.syncScheduleFromDatabase(ruleChainId);
  }

  /**
   * Get all schedules for an organization
   * @param {number} organizationId 
   */
  getSchedulesByOrganization(organizationId) {
    this._ensureInitialized();
    
    return this.scheduleManager.getSchedulesByOrganization(organizationId);
  }

  /**
   * Get schedule by ID
   * @param {string|number} scheduleId 
   */
  getSchedule(scheduleId) {
    this._ensureInitialized();
    
    return this.scheduleManager.getSchedule(scheduleId);
  }

  /**
   * Manually trigger a schedule
   * @param {string|number} scheduleId 
   */
  async manuallyTriggerSchedule(scheduleId) {
    this._ensureInitialized();
    
    return this.scheduleManager.manuallyTriggerSchedule(scheduleId);
  }

  /**
   * Get schedule statistics
   */
  getScheduleStats() {
    this._ensureInitialized();
    
    return this.scheduleManager.getStats();
  }

  /**
   * Stop all schedules
   */
  stopAllSchedules() {
    this._ensureInitialized();
    
    return this.scheduleManager.stopAll();
  }

  /**
   * Start all enabled schedules
   */
  startAllSchedules() {
    this._ensureInitialized();
    
    return this.scheduleManager.startAll();
  }

  /**
   * Refresh all database schedules
   */
  async refreshDatabaseSchedules() {
    this._ensureInitialized();
    
    return this.scheduleManager.refreshDatabaseSchedules();
  }

  /**
   * Enable database-backed scheduling for a rule chain
   * @param {number} ruleChainId - Rule chain ID
   * @param {string} cronExpression - Cron expression
   * @param {Object} options - Schedule options
   */
  async enableRuleChainSchedule(ruleChainId, cronExpression, options = {}) {
    this._ensureInitialized();
    
    return this.scheduleManager.addDatabaseSchedule(ruleChainId, {
      cronExpression,
      ...options
    });
  }

  /**
   * Disable database-backed scheduling for a rule chain
   * @param {number} ruleChainId - Rule chain ID
   */
  async disableRuleChainSchedule(ruleChainId) {
    this._ensureInitialized();
    
    return this.scheduleManager.removeDatabaseSchedule(ruleChainId);
  }

  /**
   * Update database-backed scheduling for a rule chain
   * @param {number} ruleChainId - Rule chain ID
   * @param {Object} updates - Schedule updates
   */
  async updateRuleChainSchedule(ruleChainId, updates) {
    this._ensureInitialized();
    
    return this.scheduleManager.updateDatabaseSchedule(ruleChainId, updates);
  }

  // ========== END ENHANCED SCHEDULE MANAGEMENT ==========
}

// Create singleton instance only if rule engine is not disabled
let ruleEngine = null;

if (process.env.DISABLE_RULE_ENGINE !== 'true') {
  ruleEngine = new RuleEngine();
}

// Export both the class and the singleton instance
module.exports = {
  RuleEngine,
  ruleEngine,
  EventTypes,
  EventPriority,
  EventSources
}; 