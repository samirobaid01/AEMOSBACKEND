'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DeviceToken', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      token: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true
      },
      sensorId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'Sensor',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastUsed: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'revoked', 'expired'),
        defaultValue: 'active'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('DeviceToken', ['sensorId']);
    await queryInterface.addIndex('DeviceToken', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('DeviceToken');
  }
}; 