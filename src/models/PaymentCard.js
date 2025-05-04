const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentCard = sequelize.define('PaymentCard', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  organizationId: {
    type: DataTypes.BIGINT
  },
  name: {
    type: DataTypes.STRING(50)
  },
  cardNumber: {
    type: DataTypes.STRING(50)
  },
  cvv: {
    type: DataTypes.STRING(10)
  },
  zip: {
    type: DataTypes.STRING(10)
  },
  expiry: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'PaymentCard',
  timestamps: false
});

module.exports = PaymentCard; 