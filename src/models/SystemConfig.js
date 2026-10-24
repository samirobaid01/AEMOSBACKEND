const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SystemConfig = sequelize.define('SystemConfig', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  key: {
    type: DataTypes.STRING(128),
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  updatedBy: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
}, {
  tableName: 'SystemConfig',
  timestamps: true,
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
});

module.exports = SystemConfig;
