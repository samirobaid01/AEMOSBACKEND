const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceStateType = sequelize.define('DeviceStateType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT
  },
  valueType: {
    type: DataTypes.ENUM('boolean', 'number', 'string', 'percentage'),
    allowNull: false,
    defaultValue: 'boolean'
  },
  deviceType: {
    type: DataTypes.ENUM('actuator', 'controller', 'gateway', 'sensor_hub', 'hybrid'),
    allowNull: true,
    comment: 'Optional filter by device type'
  }
}, {
  tableName: 'DeviceStateType',
  timestamps: false
});

module.exports = DeviceStateType; 