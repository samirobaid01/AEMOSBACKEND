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
    allowNull: false,
    defaultValue: 'hybrid'
  },
  scheduleEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  cronExpression: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'UTC'
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  maxRetries: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  retryDelay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
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
    allowNull: false,
    defaultValue: 0
  },
  failureCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
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
  timestamps: true
});

module.exports = RuleChain; 