const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrganizationUser = sequelize.define('OrganizationUser', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  organizationId: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE
  },
  updatedAt: {
    type: DataTypes.DATE
  },
  role: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'OrganizationUser',
  timestamps: true
});

module.exports = OrganizationUser; 