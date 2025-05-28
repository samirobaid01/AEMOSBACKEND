const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RuleChainNode = sequelize.define('RuleChainNode', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ruleChainId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('filter', 'transform', 'action'),
    allowNull: false
  },
  config: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  nextNodeId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'RuleChainNode',
  timestamps: false
});

module.exports = RuleChainNode; 