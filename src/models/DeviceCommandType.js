const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceCommandType = sequelize.define('DeviceCommandType', {
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
  deviceType: {
    type: DataTypes.ENUM('actuator', 'controller', 'gateway', 'sensor_hub', 'hybrid'),
    allowNull: true
  },
  parametersSchema: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'JSON schema for valid parameters'
  },
  expectedResponseTimeMs: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'DeviceCommandType',
  timestamps: false,
  indexes: [
    {
      name: 'uniq_command_name',
      unique: true,
      fields: ['name']
    }
  ]
});

module.exports = DeviceCommandType; 