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
  uuid: {
    type: DataTypes.STRING(36)
  },
  createdAt: {
    type: DataTypes.DATE
  },
  updatedAt: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending', 'maintenance', 'faulty', 'retired'),
    defaultValue: 'pending'
  },
  deviceType: {
    type: DataTypes.ENUM('actuator', 'controller', 'gateway', 'sensor_hub', 'hybrid', 'other'),
    defaultValue: 'actuator',
    allowNull: false
  },
  communicationProtocol: {
    type: DataTypes.ENUM('wifi', 'ble', 'lorawan', 'zigbee', 'modbus', 'mqtt', 'http', 'coap', 'other'),
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
    allowNull: true,
    comment: 'Device-specific capabilities and features'
  },
  controlModes: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'e.g., manual, remote, scheduled, sensor'
  }
}, {
  tableName: 'Device',
  timestamps: true
});

module.exports = Device; 