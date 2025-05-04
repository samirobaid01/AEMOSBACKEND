const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DataStream = sequelize.define('DataStream', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  value: {
    type: DataTypes.STRING(50)
  },
  telemetryDataId: {
    type: DataTypes.BIGINT
  },
  recievedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'DataStream',
  timestamps: false
});

module.exports = DataStream; 