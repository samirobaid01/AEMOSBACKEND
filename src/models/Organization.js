const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  parentId: {
    type: DataTypes.BIGINT
  },
  name: {
    type: DataTypes.STRING(50)
  },
  status: {
    type: DataTypes.BOOLEAN
  },
  detail: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE
  },
  updatedAt: {
    type: DataTypes.DATE
  },
  paymentMethods: {
    type: DataTypes.TEXT
  },
  image: {
    type: DataTypes.TEXT
  },
  address: {
    type: DataTypes.TEXT
  },
  zip: {
    type: DataTypes.STRING(50)
  },
  email: {
    type: DataTypes.TEXT
  },
  isParent: {
    type: DataTypes.BOOLEAN
  },
  contactNumber: {
    type: DataTypes.STRING(50)
  }
}, {
  tableName: 'Organization',
  timestamps: true
});

// Self-referential association for parent-child relationships
Organization.belongsTo(Organization, { foreignKey: 'parentId', as: 'parent' });
Organization.hasMany(Organization, { foreignKey: 'parentId', as: 'children' });

module.exports = Organization; 