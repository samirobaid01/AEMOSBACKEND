const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceStateTransition = sequelize.define('DeviceStateTransition', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  deviceType: {
    type: DataTypes.ENUM('actuator', 'controller', 'gateway', 'sensor_hub', 'hybrid'),
    allowNull: false
  },
  fromStateId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  toStateId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  isAllowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  minimumDelaySeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Minimum time required between these transitions'
  }
}, {
  tableName: 'DeviceStateTransition',
  timestamps: false,
  indexes: [
    {
      name: 'uniq_transition',
      unique: true,
      fields: ['deviceType', 'fromStateId', 'toStateId']
    }
  ]
});

module.exports = DeviceStateTransition; 