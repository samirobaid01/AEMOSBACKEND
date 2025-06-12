const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RuleChainNode = sequelize.define('RuleChainNode', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
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
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['name', 'ruleChainId'],
      name: 'unique_name_per_rule_chain'
    }
  ]
});

module.exports = RuleChainNode; 