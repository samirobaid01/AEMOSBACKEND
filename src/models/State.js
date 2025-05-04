const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const State = sequelize.define('State', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  deviceId: {
    type: DataTypes.BIGINT
  },
  name: {
    type: DataTypes.STRING(50)
  },
  isActive: {
    type: DataTypes.BOOLEAN
  }
}, {
  tableName: 'State',
  timestamps: false
});

module.exports = State; 