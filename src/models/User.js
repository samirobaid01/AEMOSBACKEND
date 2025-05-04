const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  userName: {
    type: DataTypes.STRING(256)
  },
  email: {
    type: DataTypes.STRING(256),
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.TEXT
  },
  phoneNumber: {
    type: DataTypes.STRING(50)
  },
  accessFailedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  image: {
    type: DataTypes.BLOB('long')
  },
  detail: {
    type: DataTypes.TEXT
  },
  notifyByMessage: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notifyByEmail: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notifyBySMS: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  smsNumber: {
    type: DataTypes.STRING(50)
  },
  createdBy: {
    type: DataTypes.BIGINT
  },
  createdAt: {
    type: DataTypes.DATE
  },
  updatedAt: {
    type: DataTypes.DATE
  },
  termsAndConditions: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'User',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

// Instance method to check password
User.prototype.isValidPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Self-referential relationship for createdBy
User.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = User; 