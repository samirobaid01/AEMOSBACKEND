const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceState = sequelize.define('DeviceState', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  deviceId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'Device',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  stateName: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  dataType: {
    type: DataTypes.STRING(50),
    defaultValue: 'string'
  },
  defaultValue: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  allowedValues: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
  }
}, {
  tableName: 'DeviceState',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['deviceId', 'stateName'],
      name: 'unique_device_stateName'
    }
  ]
});

module.exports = DeviceState; 