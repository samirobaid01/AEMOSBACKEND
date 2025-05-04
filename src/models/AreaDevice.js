const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AreaDevice = sequelize.define('AreaDevice', {
  areaId: {
    type: DataTypes.BIGINT,
    primaryKey: true
  },
  deviceId: {
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
  tableName: 'AreaDevice',
  timestamps: true
});

module.exports = AreaDevice; 