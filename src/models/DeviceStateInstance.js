const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceStateInstance = sequelize.define('DeviceStateInstance', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  deviceStateId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'DeviceState',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  value: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  fromTimestamp: {
    type: DataTypes.DATE(6),
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP(6)')
  },
  toTimestamp: {
    type: DataTypes.DATE(6),
    allowNull: true
  },
  initiatedBy: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  initiatorId: {
    type: DataTypes.BIGINT,
    allowNull: true
  }
}, {
  tableName: 'DeviceStateInstance',
  timestamps: false,
  indexes: [
    {
      fields: ['deviceStateId'],
      name: 'idx_deviceStateId'
    }
  ]
});

module.exports = DeviceStateInstance; 