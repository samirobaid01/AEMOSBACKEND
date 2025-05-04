const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AreaSensor = sequelize.define('AreaSensor', {
  areaId: {
    type: DataTypes.BIGINT,
    primaryKey: true
  },
  sensorId: {
    type: DataTypes.BIGINT,
    primaryKey: true
  },
  detail: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE
  },
  updatedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'AreaSensor',
  timestamps: true
});

module.exports = AreaSensor; 