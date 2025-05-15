const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AreaSensor = sequelize.define('AreaSensor', {
  areaId: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    references: {
      model: 'Area',
      key: 'id'
    }
  },
  sensorId: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    references: {
      model: 'Sensor',
      key: 'id'
    }
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