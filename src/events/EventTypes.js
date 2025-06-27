/**
 * Event Types for Rule Engine System
 * Defines all event types and their expected data structures
 */

const EventTypes = {
  // Telemetry Data Events
  TELEMETRY_DATA_RECEIVED: 'telemetry.data.received',
  TELEMETRY_BATCH_RECEIVED: 'telemetry.batch.received',
  
  // Device State Events
  DEVICE_STATE_CHANGED: 'device.state.changed',
  DEVICE_CONNECTED: 'device.connected',
  DEVICE_DISCONNECTED: 'device.disconnected',
  
  // Scheduled Events
  SCHEDULE_TRIGGERED: 'schedule.triggered',
  
  // External Events
  EXTERNAL_EVENT_RECEIVED: 'external.event.received',
  
  // Manual Triggers
  MANUAL_TRIGGER_REQUESTED: 'manual.trigger.requested',
  
  // System Events
  RULE_CHAIN_EXECUTED: 'rulechain.executed',
  RULE_CHAIN_FAILED: 'rulechain.failed',
  
  // Configuration Events
  RULE_CHAIN_UPDATED: 'rulechain.updated',
  RULE_CHAIN_DELETED: 'rulechain.deleted',
  INDEX_REBUILD_REQUIRED: 'index.rebuild.required'
};

/**
 * Event Data Schemas - Define expected structure for each event type
 */
const EventSchemas = {
  [EventTypes.TELEMETRY_DATA_RECEIVED]: {
    sensorUuid: 'string',
    telemetryDataId: 'number', 
    variableName: 'string',
    value: 'any',
    datatype: 'string', // 'number', 'boolean', 'string'
    timestamp: 'Date',
    organizationId: 'number',
    metadata: {
      source: 'string', // 'http_api', 'token_auth', 'batch'
      priority: 'string', // 'low', 'normal', 'high', 'critical'
      urgent: 'boolean'
    }
  },
  
  [EventTypes.DEVICE_STATE_CHANGED]: {
    deviceUuid: 'string',
    stateName: 'string',
    value: 'any',
    previousValue: 'any',
    timestamp: 'Date',
    organizationId: 'number',
    metadata: {
      source: 'string', // 'state_change', 'rule_chain', 'manual'
      initiatedBy: 'string'
    }
  },
  
  [EventTypes.SCHEDULE_TRIGGERED]: {
    cronExpression: 'string',
    scheduleName: 'string',
    organizationId: 'number',
    timestamp: 'Date',
    metadata: {
      source: 'scheduler'
    }
  },
  
  [EventTypes.MANUAL_TRIGGER_REQUESTED]: {
    organizationId: 'number',
    ruleChainId: 'number', // optional - specific chain
    entityUuids: 'array', // optional - specific entities
    triggeredBy: 'number', // user ID
    timestamp: 'Date',
    metadata: {
      source: 'manual_api'
    }
  }
};

/**
 * Event Priority Levels
 */
const EventPriority = {
  CRITICAL: 'critical',
  HIGH: 'high', 
  NORMAL: 'normal',
  LOW: 'low'
};

/**
 * Event Sources
 */
const EventSources = {
  HTTP_API: 'http_api',
  TOKEN_AUTH: 'token_auth',
  BATCH_PROCESS: 'batch',
  STATE_CHANGE: 'state_change',
  RULE_CHAIN: 'rule_chain',
  MANUAL: 'manual_api',
  SCHEDULER: 'scheduler',
  EXTERNAL_API: 'external_api'
};

module.exports = {
  EventTypes,
  EventSchemas,
  EventPriority,
  EventSources
}; 