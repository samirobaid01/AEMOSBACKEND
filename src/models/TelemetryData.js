const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TelemetryData = sequelize.define('TelemetryData', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  variableName: {
    type: DataTypes.STRING(50)
  },
  datatype: {
    type: DataTypes.STRING(50)
  },
  sensorId: {
    type: DataTypes.BIGINT
  }
}, {
  tableName: 'TelemetryData',
  timestamps: false
});

module.exports = TelemetryData; 