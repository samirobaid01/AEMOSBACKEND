const logger = require('../../utils/logger');
const { ruleEngineQueue, getQueueCounts } = require('./RuleEngineQueue');
const backpressureManager = require('../../services/backpressureManager');
const RuleChainIndex = require('../indexing/RuleChainIndex');
const TelemetryData = require('../../models/TelemetryData');
const DeviceState = require('../../models/DeviceState');

const DEFAULT_PRIORITY_MAP = {
  'scheduled': 1,
  'critical-alarm': 1,
  'telemetry-data': 5,
  'device-state-change': 5,
  'batch-operation': 10
};

const extractVariableNames = async (payload) => {
  const { telemetryDataId, deviceStateId, variableNames} = payload;

  if (variableNames && Array.isArray(variableNames) && variableNames.length > 0) {
    return { variables: variableNames, cached: true };
  }

  if (telemetryDataId) {
    try {
      const telemetryData = await TelemetryData.findByPk(telemetryDataId, {
        attributes: ['variableName']
      });
      if (telemetryData && telemetryData.variableName) {
        return { variables: [telemetryData.variableName], cached: false };
      }
    } catch (error) {
      logger.warn(`Failed to fetch telemetry variable name for ID ${telemetryDataId}`, {
        error: error.message
      });
    }
  }

  if (deviceStateId) {
    try {
      const deviceState = await DeviceState.findByPk(deviceStateId, {
        attributes: ['stateName']
      });
      if (deviceState && deviceState.stateName) {
        return { variables: [deviceState.stateName], cached: false };
      }
    } catch (error) {
      logger.warn(`Failed to fetch device state name for ID ${deviceStateId}`, {
        error: error.message
      });
    }
  }

  return { variables: [], cached: false };
};

const emit = async (eventType, payload, options = {}) => {
  try {
    const priority = options.priority || DEFAULT_PRIORITY_MAP[eventType] || parseInt(process.env.DEFAULT_EVENT_PRIORITY || '5', 10);
    
    const { sensorUUID, deviceUUID, dataStreamId, telemetryDataId, deviceStateId } = payload;
    
    let originatorType = null;
    let originatorId = null;
    let variableNames = [];

    if (sensorUUID) {
      originatorType = 'sensor';
      originatorId = sensorUUID;
    } else if (deviceUUID) {
      originatorType = 'device';
      originatorId = deviceUUID;
    }

    if (originatorId) {
      const { variables, cached } = await extractVariableNames(payload);
      variableNames = variables;

      if (variableNames.length === 0) {
        logger.debug('No variables found for event, skipping rule engine', {
          eventType,
          originatorType,
          originatorId,
          telemetryDataId,
          deviceStateId
        });
        return {
          rejected: false,
          skipped: true,
          reason: 'no-variables',
          eventType
        };
      }

      const ruleChainIds = await RuleChainIndex.getRuleChainsForOriginator(
        originatorType,
        originatorId,
        variableNames
      );

      if (ruleChainIds.length === 0) {
        logger.debug('No rule chains found for event, skipping', {
          eventType,
          originatorType,
          originatorId,
          variableNames,
          variablesCached: cached
        });
        return {
          rejected: false,
          skipped: true,
          reason: 'no-rule-chains',
          eventType,
          originatorType,
          originatorId,
          variableNames
        };
      }

      logger.debug('Rule chains found for event', {
        eventType,
        originatorType,
        originatorId,
        variableNames,
        ruleChainCount: ruleChainIds.length,
        ruleChainIds
      });

      payload.ruleChainIds = ruleChainIds;
      payload.variableNames = variableNames;
    }

    const queueCounts = await getQueueCounts();
    
    const backpressureCheck = backpressureManager.shouldAcceptEvent(queueCounts, priority);
    
    if (!backpressureCheck.accept) {
      logger.warn(`Event rejected due to backpressure`, {
        eventType,
        priority,
        reason: backpressureCheck.reason,
        queueDepth: backpressureCheck.queueDepth,
        threshold: backpressureCheck.threshold,
        circuitState: backpressureCheck.circuitState,
        originatorType,
        originatorId,
        variableNames
      });
      
      return {
        rejected: true,
        reason: backpressureCheck.reason,
        queueDepth: backpressureCheck.queueDepth,
        eventType,
        priority,
        originatorType,
        originatorId,
        variableNames
      };
    }

    const jobOptions = {
      ...options,
      priority
    };

    const job = await ruleEngineQueue.add(eventType, {
      eventType,
      payload,
      priority,
      enqueuedAt: new Date().toISOString()
    }, jobOptions);

    return {
      rejected: false,
      job,
      queueDepth: (queueCounts.waiting || 0) + (queueCounts.active || 0),
      originatorType,
      originatorId,
      variableNames,
      ruleChainCount: payload.ruleChainIds ? payload.ruleChainIds.length : null
    };
  } catch (error) {
    logger.error(`Failed to enqueue rule engine event (${eventType}): ${error.message}`, {
      error: error.message,
      stack: error.stack,
      payload
    });
    return {
      rejected: true,
      reason: 'enqueue-error',
      error: error.message,
      eventType
    };
  }
};

module.exports = {
  emit
};
