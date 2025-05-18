const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceCommand = sequelize.define('DeviceCommand', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  deviceId: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  commandTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  parameters: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'acknowledged', 'failed', 'timeout', 'canceled'),
    defaultValue: 'pending'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  executedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  initiatedBy: {
    type: DataTypes.ENUM('system', 'user', 'rule', 'api'),
    allowNull: false
  },
  initiatorId: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  relatedStateId: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  timeoutAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  retryPolicy: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Retry configuration {max_attempts: 3, delay: 5000}'
  }
}, {
  tableName: 'DeviceCommand',
  timestamps: false,
  indexes: [
    {
      name: 'IDX_DeviceCommand_Device',
      fields: ['deviceId']
    },
    {
      name: 'IDX_DeviceCommand_Status',
      fields: ['status']
    },
    {
      name: 'IDX_DeviceCommand_Scheduled',
      fields: ['scheduledAt']
    },
    {
      name: 'IDX_DeviceCommand_Type',
      fields: ['commandTypeId']
    }
  ]
});

module.exports = DeviceCommand;