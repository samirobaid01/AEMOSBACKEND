const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceState = sequelize.define('DeviceState', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  deviceId: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  stateTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  stateValue: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  triggeredBySensor: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  triggeredByRule: {
    type: DataTypes.BIGINT,
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
  createdAt: {
    type: DataTypes.DATE(6),
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP(6)')
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  transitionTimeMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time taken for this state transition'
  }
}, {
  tableName: 'DeviceState',
  timestamps: false,
  indexes: [
    {
      name: 'IDX_DeviceState_Current',
      fields: ['deviceId', 'isCurrent']
    },
    {
      name: 'IDX_DeviceState_Device',
      fields: ['deviceId', ['createdAt', 'DESC']]
    },
    {
      name: 'IDX_DeviceState_Transition',
      fields: ['deviceId', 'createdAt']
    }
  ]
});

module.exports = DeviceState; 