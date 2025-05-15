const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  organizationId: {
    type: DataTypes.BIGINT,
    allowNull: true
  }
}, {
  tableName: 'Role',
  timestamps: false
});

module.exports = Role; 