const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Area = sequelize.define('Area', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50)
  },
  organizationId: {
    type: DataTypes.BIGINT
  },
  parentArea: {
    type: DataTypes.BIGINT
  },
  image: {
    type: DataTypes.TEXT
  },
  uuid: {
    type: DataTypes.STRING(36)
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'under_review', 'archived'),
    defaultValue: 'under_review'
  }
}, {
  tableName: 'Area',
  timestamps: false
});

module.exports = Area; 