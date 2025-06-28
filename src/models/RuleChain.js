const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RuleChain = sequelize.define('RuleChain', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  organizationId: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  executionType: {
    type: DataTypes.ENUM('event-triggered', 'schedule-only', 'hybrid'),
    defaultValue: 'hybrid',
    allowNull: false,
    comment: 'Defines how the rule chain should be executed: event-triggered (only by events), schedule-only (only by schedules), or hybrid (both)'
  },
  scheduleEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  cronExpression: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC',
    allowNull: false
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  maxRetries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  retryDelay: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  scheduleMetadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  lastExecutedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastErrorAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  executionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  failureCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'RuleChain',
  timestamps: true,
  indexes: [
    {
      fields: ['scheduleEnabled'],
      name: 'idx_rulechain_schedule_enabled'
    },
    {
      fields: ['lastExecutedAt'],
      name: 'idx_rulechain_last_executed'
    },
    {
      fields: ['executionType'],
      name: 'idx_rulechain_execution_type'
    },
    {
      fields: ['organizationId', 'executionType'],
      name: 'idx_rulechain_org_execution_type'
    }
  ]
});

module.exports = RuleChain; 