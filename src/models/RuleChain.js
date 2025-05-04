const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RuleChain = sequelize.define('RuleChain', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50)
  },
  description: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.BOOLEAN
  },
  executionInterval: {
    type: DataTypes.STRING(50)
  },
  lastExecution: {
    type: DataTypes.DATE
  },
  updatedAt: {
    type: DataTypes.DATE
  },
  organizationId: {
    type: DataTypes.BIGINT
  }
}, {
  tableName: 'RuleChain',
  timestamps: false
});

module.exports = RuleChain; 