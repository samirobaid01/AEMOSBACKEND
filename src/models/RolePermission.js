const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RolePermission = sequelize.define('RolePermission', {
  roleId: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false
  },
  permissionId: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false
  }
}, {
  tableName: 'RolePermission',
  timestamps: false
});

module.exports = RolePermission; 