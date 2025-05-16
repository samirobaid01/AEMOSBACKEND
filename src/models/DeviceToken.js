const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Sensor = require('./Sensor');

const DeviceToken = sequelize.define('DeviceToken', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  token: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  sensorId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'Sensor',
      key: 'id'
    }
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastUsed: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'revoked', 'expired'),
    defaultValue: 'active'
  }
}, {
  tableName: 'DeviceToken',
  timestamps: true
});

// Setup associations
DeviceToken.belongsTo(Sensor, { foreignKey: 'sensorId' });
Sensor.hasMany(DeviceToken, { foreignKey: 'sensorId' });

module.exports = DeviceToken; 