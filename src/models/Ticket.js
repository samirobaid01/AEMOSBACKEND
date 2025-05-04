const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  createdAt: {
    type: DataTypes.DATE
  },
  notificationId: {
    type: DataTypes.BIGINT
  },
  assignedTo: {
    type: DataTypes.BIGINT
  },
  comment: {
    type: DataTypes.TEXT
  },
  assignedAt: {
    type: DataTypes.DATE
  },
  acknowledgedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'Ticket',
  timestamps: false
});

module.exports = Ticket; 