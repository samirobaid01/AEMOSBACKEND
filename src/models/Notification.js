const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(250)
  },
  insight: {
    type: DataTypes.TEXT
  },
  userGroup: {
    type: DataTypes.TEXT
  },
  severity: {
    type: DataTypes.STRING(50)
  },
  organizationId: {
    type: DataTypes.BIGINT
  }
}, {
  tableName: 'Notification',
  timestamps: false
});

module.exports = Notification; 