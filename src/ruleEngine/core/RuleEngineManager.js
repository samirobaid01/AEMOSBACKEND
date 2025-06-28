const RuleChainIndex = require('../indexing/RuleChainIndex');
const { ruleChainService } = require('../../services/ruleChainService');
const { EventTypes } = require('../../events/EventTypes');
const logger = require('../../utils/logger');
const deviceStateInstanceService = require('../../services/deviceStateInstanceService');
const notificationManager = require('../../utils/notificationManager');

/**
 * Rule Engine Manager - Central orchestrator for rule processing
 * Coordinates between EventBus, RuleChainIndex, and execution
 */
class RuleEngineManager {
  constructor() {
    // Initialize components
    this.ruleChainIndex = new RuleChainIndex();
    
    // Processing metrics
    this.metrics = {
      eventsProcessed: 0,
      rulesExecuted: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      optimizationRatio: 0, // How many rules we avoided executing
      lastProcessedAt: null,
      scheduleOnlyRulesSkipped: 0 // NEW: Track schedule-only rules skipped from event processing
    };
    
    // Circuit breaker for failing rule chains
    this.circuitBreakers = new Map();
    
    logger.info('RuleEngineManager initialized');
  }

  /**
   * Process telemetry data event
   * @param {Object} eventData 
   */
  async processTelemetryEvent(eventData) {
    const startTime = Date.now();
    
    logger.info('📊 DEBUG: RuleEngineManager processing telemetry event', {
      sensorUuid: eventData.sensorUuid,
      organizationId: eventData.organizationId,
      variableName: eventData.variableName,
      value: eventData.value,
      hasIndex: !!this.ruleChainIndex,
      eventDataKeys: Object.keys(eventData)
    });
    
    try {
      const { sensorUuid, organizationId, telemetryDataId, variableName, value, datatype } = eventData;
      
      // Validate required fields
      if (!sensorUuid) {
        logger.error('❌ DEBUG: Missing sensorUuid in telemetry event', {
          eventData,
          sensorUuidType: typeof sensorUuid
        });
        return { status: 'error', error: 'Missing sensorUuid' };
      }

      if (!organizationId) {
        logger.error('❌ DEBUG: Missing organizationId in telemetry event', {
          eventData,
          organizationIdType: typeof organizationId
        });
        return { status: 'error', error: 'Missing organizationId' };
      }

      if (!variableName) {
        logger.error('❌ DEBUG: Missing variableName in telemetry event', {
          eventData,
          variableNameType: typeof variableName
        });
        return { status: 'error', error: 'Missing variableName' };
      }
      
      logger.debug('Processing telemetry event', {
        sensorUuid,
        organizationId,
        variableName,
        value
      });
      
      // 1. Find relevant rule chains using index
      const relevantRuleChainIds = await this.ruleChainIndex.findBySensorUuid(sensorUuid, organizationId);
      
      logger.info('🎯 DEBUG: Found relevant rule chains', {
        sensorUuid,
        organizationId,
        relevantRuleChains: relevantRuleChainIds,
        count: relevantRuleChainIds.length
      });
      
      if (relevantRuleChainIds.length === 0) {
        logger.warn('⚠️ DEBUG: No relevant rule chains found for sensor', {
          sensorUuid,
          organizationId
        });
        return { status: 'no_rules', processed: 0 };
      }
      
      // 2. Filter rule chains by execution type (exclude schedule-only)
      const eventEligibleRuleChains = await this._filterEventEligibleRuleChains(relevantRuleChainIds);
      
      logger.info('🔍 DEBUG: Filtered rule chains by execution type', {
        originalCount: relevantRuleChainIds.length,
        eventEligibleCount: eventEligibleRuleChains.length,
        skippedScheduleOnly: relevantRuleChainIds.length - eventEligibleRuleChains.length
      });
      
      if (eventEligibleRuleChains.length === 0) {
        logger.warn('⚠️ DEBUG: No event-eligible rule chains found (all are schedule-only)', {
          sensorUuid,
          organizationId,
          skippedCount: relevantRuleChainIds.length
        });
        this.metrics.scheduleOnlyRulesSkipped += relevantRuleChainIds.length;
        return { status: 'no_event_rules', processed: 0, skippedScheduleOnly: relevantRuleChainIds.length };
      }
      
      // 3. Prepare execution data
      const rawData = {
        sensorData: [{
          UUID: sensorUuid,
          [variableName]: this._convertValue(value, datatype),
          timestamp: eventData.timestamp
        }],
        deviceData: [] // Will be populated if needed
      };
      
      // 4. Execute event-eligible rule chains
      const results = await this._executeRuleChains(eventEligibleRuleChains, rawData, organizationId);
      
      // 5. Update metrics
      this._updateMetrics(startTime, relevantRuleChainIds.length, results.length, relevantRuleChainIds.length - eventEligibleRuleChains.length);
      
      return {
        status: 'success',
        processed: results.length,
        relevantRuleChains: relevantRuleChainIds.length,
        eventEligibleRuleChains: eventEligibleRuleChains.length,
        skippedScheduleOnly: relevantRuleChainIds.length - eventEligibleRuleChains.length,
        results
      };
      
    } catch (error) {
      logger.error('❌ DEBUG: Telemetry event processing failed', {
        sensorUuid: eventData.sensorUuid,
        error: error.message
      });
      this.executionStats.eventsFailed++;
      throw error;
    }
  }

  /**
   * Process batch telemetry events
   * @param {Object} eventData 
   */
  async processBatchTelemetryEvent(eventData) {
    const startTime = Date.now();
    
    try {
      const { telemetryData, organizationId } = eventData;
      
      logger.debug('Processing batch telemetry event', {
        batchSize: telemetryData.length,
        organizationId
      });
      
      // Group by affected rule chains to optimize execution
      const affectedRuleChains = new Set();
      const sensorDataMap = new Map();
      
      // Process each telemetry item
      for (const item of telemetryData) {
        const { sensorUuid, variableName, value, datatype } = item;
        
        // Find relevant rule chains for this sensor
        const ruleChainIds = await this.ruleChainIndex.findBySensorUuid(sensorUuid, organizationId);
        ruleChainIds.forEach(id => affectedRuleChains.add(id));
        
        // Build sensor data map
        if (!sensorDataMap.has(sensorUuid)) {
          sensorDataMap.set(sensorUuid, { UUID: sensorUuid, timestamp: item.timestamp });
        }
        sensorDataMap.get(sensorUuid)[variableName] = this._convertValue(value, datatype);
      }
      
      if (affectedRuleChains.size === 0) {
        return { status: 'no_rules', processed: 0 };
      }
      
      // Filter by execution type (exclude schedule-only)
      const eventEligibleRuleChains = await this._filterEventEligibleRuleChains(Array.from(affectedRuleChains));
      
      if (eventEligibleRuleChains.length === 0) {
        this.metrics.scheduleOnlyRulesSkipped += affectedRuleChains.size;
        return { 
          status: 'no_event_rules', 
          processed: 0, 
          skippedScheduleOnly: affectedRuleChains.size 
        };
      }
      
      // Prepare batch execution data
      const rawData = {
        sensorData: Array.from(sensorDataMap.values()),
        deviceData: []
      };
      
      // Execute event-eligible rule chains with batch data
      const results = await this._executeRuleChains(eventEligibleRuleChains, rawData, organizationId);
      
      this._updateMetrics(startTime, affectedRuleChains.size, results.length, affectedRuleChains.size - eventEligibleRuleChains.length);
      
      return {
        status: 'success',
        processed: results.length,
        batchSize: telemetryData.length,
        affectedRuleChains: affectedRuleChains.size,
        eventEligibleRuleChains: eventEligibleRuleChains.length,
        skippedScheduleOnly: affectedRuleChains.size - eventEligibleRuleChains.length,
        results
      };
      
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
      
      logger.debug('Processing device state event', {
        deviceUuid,
        stateName,
        value,
        organizationId
      });
      
      // Find relevant rule chains
      const relevantRuleChainIds = await this.ruleChainIndex.findByDeviceUuid(deviceUuid, organizationId);
      
      if (relevantRuleChainIds.length === 0) {
        return { status: 'no_rules', processed: 0 };
      }
      
      // Filter by execution type (exclude schedule-only)
      const eventEligibleRuleChains = await this._filterEventEligibleRuleChains(relevantRuleChainIds);
      
      if (eventEligibleRuleChains.length === 0) {
        this.metrics.scheduleOnlyRulesSkipped += relevantRuleChainIds.length;
        return { 
          status: 'no_event_rules', 
          processed: 0, 
          skippedScheduleOnly: relevantRuleChainIds.length 
        };
      }
      
      // Prepare execution data
      const rawData = {
        sensorData: [],
        deviceData: [{
          UUID: deviceUuid,
          [stateName]: value,
          timestamp: eventData.timestamp
        }]
      };
      
      // Execute event-eligible rule chains
      const results = await this._executeRuleChains(eventEligibleRuleChains, rawData, organizationId);
      
      this._updateMetrics(startTime, relevantRuleChainIds.length, results.length, relevantRuleChainIds.length - eventEligibleRuleChains.length);
      
      return {
        status: 'success',
        processed: results.length,
        relevantRuleChains: relevantRuleChainIds.length,
        eventEligibleRuleChains: eventEligibleRuleChains.length,
        skippedScheduleOnly: relevantRuleChainIds.length - eventEligibleRuleChains.length,
        results
      };
      
    } catch (error) {
      logger.error('Error processing device state event:', error);
      throw error;
    }
  }

  /**
   * Process scheduled event
   * @param {Object} eventData 
   */
  async processScheduledEvent(eventData) {
    const startTime = Date.now();
    
    try {
      const { cronExpression, organizationId } = eventData;
      
      logger.debug('Processing scheduled event', {
        cronExpression,
        organizationId
      });
      
      // Find rule chains with this schedule
      const relevantRuleChainIds = await this.ruleChainIndex.findBySchedule(cronExpression, organizationId);
      
      if (relevantRuleChainIds.length === 0) {
        return { status: 'no_rules', processed: 0 };
      }
      
      // For scheduled events, filter to only include schedule-eligible rule chains
      const scheduleEligibleRuleChains = await this._filterScheduleEligibleRuleChains(relevantRuleChainIds);
      
      if (scheduleEligibleRuleChains.length === 0) {
        return { 
          status: 'no_schedule_rules', 
          processed: 0, 
          skippedEventOnly: relevantRuleChainIds.length 
        };
      }
      
      // For scheduled events, collect all required data
      const rawData = await this._collectAllRequiredData(scheduleEligibleRuleChains, organizationId);
      
      // Execute schedule-eligible rule chains
      const results = await this._executeRuleChains(scheduleEligibleRuleChains, rawData, organizationId);
      
      this._updateMetrics(startTime, relevantRuleChainIds.length, results.length, relevantRuleChainIds.length - scheduleEligibleRuleChains.length);
      
      return {
        status: 'success',
        processed: results.length,
        relevantRuleChains: relevantRuleChainIds.length,
        scheduleEligibleRuleChains: scheduleEligibleRuleChains.length,
        skippedEventOnly: relevantRuleChainIds.length - scheduleEligibleRuleChains.length,
        results
      };
      
    } catch (error) {
      logger.error('Error processing scheduled event:', error);
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
      const { organizationId, ruleChainId, entityUuids } = eventData;
      
      logger.debug('Processing manual trigger', {
        organizationId,
        ruleChainId,
        entityUuids
      });
      
      // Find rule chains to execute
      const relevantRuleChainIds = await this.ruleChainIndex.findForManualTrigger(organizationId, ruleChainId);
      
      if (relevantRuleChainIds.length === 0) {
        return { status: 'no_rules', processed: 0 };
      }
      
      // For manual triggers, we execute all eligible rule chains regardless of execution type
      // as manual triggers are explicit user actions
      
      // Collect all required data for manual trigger
      const rawData = await this._collectAllRequiredData(relevantRuleChainIds, organizationId, entityUuids);
      
      // Execute rule chains
      const results = await this._executeRuleChains(relevantRuleChainIds, rawData, organizationId);
      
      this._updateMetrics(startTime, relevantRuleChainIds.length, results.length, 0);
      
      return {
        status: 'success',
        processed: results.length,
        relevantRuleChains: relevantRuleChainIds.length,
        triggeredBy: eventData.triggeredBy,
        results
      };
      
    } catch (error) {
      logger.error('Error processing manual trigger:', error);
      throw error;
    }
  }

  /**
   * Process device connection event
   * @param {Object} eventData 
   */
  async processDeviceConnectionEvent(eventData) {
    // Similar to device state event but for connection status
    return this.processDeviceStateEvent({
      ...eventData,
      stateName: 'connectionStatus',
      value: 'connected'
    });
  }

  /**
   * Process device disconnection event
   * @param {Object} eventData 
   */
  async processDeviceDisconnectionEvent(eventData) {
    // Similar to device state event but for disconnection status
    return this.processDeviceStateEvent({
      ...eventData,
      stateName: 'connectionStatus',
      value: 'disconnected'
    });
  }

  /**
   * Process external event
   * @param {Object} eventData 
   */
  async processExternalEvent(eventData) {
    // For external events, we might need to execute all rule chains
    // or specific ones based on the event configuration
    return this.processManualTrigger({
      organizationId: eventData.organizationId,
      triggeredBy: 'external_system',
      timestamp: eventData.timestamp
    });
  }

  /**
   * Filter rule chains that are eligible for event-based execution
   * Excludes 'schedule-only' rule chains
   * @param {Array} ruleChainIds 
   * @returns {Array} Filtered rule chain IDs
   */
  async _filterEventEligibleRuleChains(ruleChainIds) {
    if (ruleChainIds.length === 0) return [];
    
    try {
      // Get rule chains from database to check their executionType
      const { RuleChain } = require('../../models/initModels');
      
      const ruleChains = await RuleChain.findAll({
        where: {
          id: ruleChainIds
        },
        attributes: ['id', 'executionType']
      });
      
      // Filter to only include 'event-triggered' and 'hybrid' rule chains
      const eventEligibleIds = ruleChains
        .filter(rc => rc.executionType === 'event-triggered' || rc.executionType === 'hybrid')
        .map(rc => rc.id);
      
      logger.debug('🔍 DEBUG: Event-eligible rule chains filtered', {
        originalCount: ruleChainIds.length,
        eventEligibleCount: eventEligibleIds.length,
        filteredRuleChains: ruleChains.map(rc => ({
          id: rc.id,
          executionType: rc.executionType,
          included: eventEligibleIds.includes(rc.id)
        }))
      });
      
      return eventEligibleIds;
    } catch (error) {
      logger.error('Error filtering event-eligible rule chains:', error);
      // Fallback: return all rule chains if filtering fails
      return ruleChainIds;
    }
  }

  /**
   * Filter rule chains that are eligible for schedule-based execution
   * Excludes 'event-triggered' rule chains
   * @param {Array} ruleChainIds 
   * @returns {Array} Filtered rule chain IDs
   */
  async _filterScheduleEligibleRuleChains(ruleChainIds) {
    if (ruleChainIds.length === 0) return [];
    
    try {
      // Get rule chains from database to check their executionType
      const { RuleChain } = require('../../models/initModels');
      
      const ruleChains = await RuleChain.findAll({
        where: {
          id: ruleChainIds
        },
        attributes: ['id', 'executionType']
      });
      
      // Filter to only include 'schedule-only' and 'hybrid' rule chains
      const scheduleEligibleIds = ruleChains
        .filter(rc => rc.executionType === 'schedule-only' || rc.executionType === 'hybrid')
        .map(rc => rc.id);
      
      logger.debug('📅 DEBUG: Schedule-eligible rule chains filtered', {
        originalCount: ruleChainIds.length,
        scheduleEligibleCount: scheduleEligibleIds.length,
        filteredRuleChains: ruleChains.map(rc => ({
          id: rc.id,
          executionType: rc.executionType,
          included: scheduleEligibleIds.includes(rc.id)
        }))
      });
      
      return scheduleEligibleIds;
    } catch (error) {
      logger.error('Error filtering schedule-eligible rule chains:', error);
      // Fallback: return all rule chains if filtering fails
      return ruleChainIds;
    }
  }

  /**
   * Execute multiple rule chains with given data
   * @param {Array} ruleChainIds 
   * @param {Object} rawData 
   * @param {number} organizationId 
   */
  async _executeRuleChains(ruleChainIds, rawData, organizationId) {
    const results = [];
    
    // Execute rule chains in parallel for better performance
    const promises = ruleChainIds.map(async (ruleChainId) => {
      try {
        // Check circuit breaker
        if (this._isCircuitBreakerOpen(ruleChainId)) {
          logger.warn(`Skipping rule chain ${ruleChainId} - circuit breaker open`);
          return {
            ruleChainId,
            status: 'skipped',
            reason: 'circuit_breaker_open'
          };
        }
        
        // Execute the rule chain
        const result = await ruleChainService.execute(ruleChainId, rawData);
        
        // Update circuit breaker on success
        this._recordSuccess(ruleChainId);
        
        // Process action results to create device state instances and notifications
        await this._processActionResults(result, ruleChainId);
        
        return {
          ruleChainId,
          status: 'success',
          result
        };
        
      } catch (error) {
        logger.error(`Error executing rule chain ${ruleChainId}:`, error);
        
        // Update circuit breaker on failure
        this._recordFailure(ruleChainId);
        
        return {
          ruleChainId,
          status: 'error',
          error: error.message
        };
      }
    });
    
    const settledResults = await Promise.allSettled(promises);
    
    settledResults.forEach((settled, index) => {
      if (settled.status === 'fulfilled') {
        results.push(settled.value);
      } else {
        results.push({
          ruleChainId: ruleChainIds[index],
          status: 'error',
          error: settled.reason.message
        });
      }
    });
    
    return results;
  }

  /**
   * Collect all required data for rule chains
   * @param {Array} ruleChainIds 
   * @param {number} organizationId 
   * @param {Array} entityUuids - Optional filter
   */
  async _collectAllRequiredData(ruleChainIds, organizationId, entityUuids = null) {
    // This would use the same data collection logic from the original ruleChainService
    // but optimized to only collect data needed by the specific rule chains
    
    // For now, return empty data - this will be enhanced in next iterations
    return {
      sensorData: [],
      deviceData: []
    };
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
   * Update processing metrics
   * @param {number} startTime 
   * @param {number} totalRuleChains 
   * @param {number} executedRuleChains 
   * @param {number} skippedRuleChains 
   */
  _updateMetrics(startTime, totalRuleChains, executedRuleChains, skippedRuleChains = 0) {
    this.metrics.eventsProcessed++;
    this.metrics.rulesExecuted += executedRuleChains;
    this.metrics.scheduleOnlyRulesSkipped += skippedRuleChains;
    this.metrics.lastProcessedAt = new Date();
    
    const executionTime = Date.now() - startTime;
    this.metrics.totalExecutionTime += executionTime;
    this.metrics.averageExecutionTime = this.metrics.totalExecutionTime / this.metrics.eventsProcessed;
    
    // Calculate optimization ratio (how many rules we avoided executing)
    const totalPossibleRules = totalRuleChains;
    const actuallyExecuted = executedRuleChains;
    this.metrics.optimizationRatio = totalPossibleRules > 0 ? 
      ((totalPossibleRules - actuallyExecuted) / totalPossibleRules) * 100 : 0;
  }

  /**
   * Circuit breaker implementation
   */
  _isCircuitBreakerOpen(ruleChainId) {
    const breaker = this.circuitBreakers.get(ruleChainId);
    if (!breaker) return false;
    
    const now = Date.now();
    
    // Check if circuit should be reset
    if (breaker.state === 'open' && now - breaker.lastFailure > breaker.timeout) {
      breaker.state = 'half-open';
      breaker.failures = 0;
    }
    
    return breaker.state === 'open';
  }

  _recordSuccess(ruleChainId) {
    const breaker = this.circuitBreakers.get(ruleChainId);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
    }
  }

  _recordFailure(ruleChainId) {
    let breaker = this.circuitBreakers.get(ruleChainId);
    if (!breaker) {
      breaker = {
        failures: 0,
        state: 'closed',
        threshold: 5, // Open after 5 failures
        timeout: 60000, // 1 minute timeout
        lastFailure: null
      };
      this.circuitBreakers.set(ruleChainId, breaker);
    }
    
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= breaker.threshold) {
      breaker.state = 'open';
      logger.warn(`Circuit breaker opened for rule chain ${ruleChainId}`);
    }
  }

  /**
   * Get processing metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get rule chain index statistics
   * @param {number} organizationId 
   */
  getIndexStats(organizationId) {
    return this.ruleChainIndex.getIndexStats(organizationId);
  }

  /**
   * Manually rebuild index for organization
   * @param {number} organizationId 
   */
  async rebuildIndex(organizationId) {
    return this.ruleChainIndex.rebuildIndex(organizationId);
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      eventsProcessed: 0,
      rulesExecuted: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      optimizationRatio: 0,
      lastProcessedAt: null,
      scheduleOnlyRulesSkipped: 0
    };
    
    logger.info('RuleEngineManager metrics reset');
  }

  /**
   * Process action results from rule chain execution
   * Creates device state instances and sends notifications for actions
   * @param {Object} executionResult - Result from rule chain execution
   * @param {number} ruleChainId - ID of the executed rule chain
   */
  async _processActionResults(executionResult, ruleChainId) {
    try {
      // Extract action results from execution
      const deviceStateActions = executionResult.nodeResults?.actions;
      
      if (!deviceStateActions || deviceStateActions.length === 0) {
        logger.debug('No actions to process for rule chain', { ruleChainId });
        return;
      }

      logger.info('🎬 DEBUG: Processing action results', {
        ruleChainId,
        actionCount: deviceStateActions.length,
        actions: deviceStateActions.map(action => ({
          nodeId: action.nodeId,
          deviceUuid: action.command?.deviceUuid,
          command: action.command
        }))
      });

      // Process each action
      for (const action of deviceStateActions) {
        try {
          if (!action.command || !action.command.deviceUuid) {
            logger.warn('⚠️ DEBUG: Skipping action without device command', {
              ruleChainId,
              nodeId: action.nodeId,
              action
            });
            continue;
          }

          // Transform action data to match required format for device state service
          const stateChangeData = {
            deviceUuid: action.command.deviceUuid,
            stateName: action.command.stateName || 'state',
            value: action.command.value,
            initiatedBy: 'rule_chain',
            metadata: {
              ruleChainId: ruleChainId,
              ruleChainName: executionResult.name || `RuleChain-${ruleChainId}`,
              nodeId: action.nodeId,
              timestamp: new Date().toISOString()
            }
          };

          logger.info('🔄 DEBUG: Creating device state instance', {
            ruleChainId,
            nodeId: action.nodeId,
            stateChangeData
          });

          // Create device state instance
          const result = await deviceStateInstanceService.createInstance(stateChangeData);

          logger.info('✅ DEBUG: Device state instance created', {
            ruleChainId,
            nodeId: action.nodeId,
            result: result?.metadata || result
          });

          // Queue notification if metadata is available
          if (result && result.metadata) {
            await notificationManager.queueStateChangeNotification(
              {
                ...result.metadata,
                triggeredBy: 'rule_chain',
                ruleChainDetails: stateChangeData.metadata
              },
              null,  // default priority
              true   // broadcast to all since it's system-initiated
            );

            // Update action with notification status
            action.notificationSent = true;
            action.notificationDetails = {
              triggeredBy: 'rule_chain',
              priority: 'normal',
              broadcast: true,
              timestamp: new Date().toISOString()
            };

            logger.info('📨 DEBUG: Notification queued for device state change', {
              ruleChainId,
              nodeId: action.nodeId,
              deviceUuid: action.command.deviceUuid
            });
          } else {
            logger.warn('⚠️ DEBUG: No metadata returned from device state service', {
              ruleChainId,
              nodeId: action.nodeId,
              result
            });
          }

        } catch (error) {
          logger.error('❌ DEBUG: Error processing device state change for action', {
            ruleChainId,
            nodeId: action.nodeId,
            error: error.message,
            stack: error.stack
          });

          // Update action with error status
          action.notificationSent = false;
          action.error = error.message;
          action.errorTimestamp = new Date().toISOString();
        }
      }

      logger.info('🎭 DEBUG: Action processing completed', {
        ruleChainId,
        totalActions: deviceStateActions.length,
        successfulActions: deviceStateActions.filter(action => action.notificationSent).length,
        failedActions: deviceStateActions.filter(action => action.error).length
      });

    } catch (error) {
      logger.error('❌ DEBUG: Error in _processActionResults', {
        ruleChainId,
        error: error.message,
        stack: error.stack
      });
      // Don't throw - this shouldn't break rule chain execution
    }
  }
}

module.exports = RuleEngineManager; 