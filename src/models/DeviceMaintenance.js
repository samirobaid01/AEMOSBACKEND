const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceMaintenance = sequelize.define('DeviceMaintenance', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  deviceId: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  maintenanceType: {
    type: DataTypes.ENUM('calibration', 'cleaning', 'repair', 'firmware_update', 'battery_replacement', 'inspection'),
    allowNull: false
  },
  performedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
  },
  performedBy: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT
  },
  nextMaintenanceDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('completed', 'scheduled', 'failed'),
    defaultValue: 'completed'
  },
  relatedStateId: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  maintenanceData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Calibration readings, firmware version etc.'
  }
}, {
  tableName: 'DeviceMaintenance',
  timestamps: false
});

module.exports = DeviceMaintenance; 