const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50)
  },
  description: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending', 'maintenance', 'faulty', 'retired'),
    defaultValue: 'pending'
  },
  uuid: {
    type: DataTypes.STRING(36)
  },
  createdAt: {
    type: DataTypes.DATE
  },
  updatedAt: {
    type: DataTypes.DATE
  },
  deviceType: {
    type: DataTypes.ENUM('actuator', 'controller', 'gateway', 'sensor_hub', 'hybrid'),
    defaultValue: 'actuator',
    allowNull: false
  },
  controlType: {
    type: DataTypes.ENUM('binary', 'percentage', 'multistate', 'custom'),
    defaultValue: 'binary',
    allowNull: false
  },
  minValue: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  maxValue: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  defaultState: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  communicationProtocol: {
    type: DataTypes.ENUM('wifi', 'ble', 'lorawan', 'zigbee', 'modbus', 'mqtt', 'http', 'coap'),
    allowNull: true
  },
  isCritical: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastHeartbeat: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  capabilities: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'Device',
  timestamps: true
});

module.exports = Device; 