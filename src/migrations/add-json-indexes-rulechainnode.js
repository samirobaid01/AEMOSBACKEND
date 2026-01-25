const { QueryTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE RuleChainNode 
        ADD INDEX idx_rulechainnode_type_sourceType (
          type,
          (CAST(JSON_EXTRACT(config, '$.sourceType') AS CHAR(20)))
        );
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE RuleChainNode 
        ADD INDEX idx_rulechainnode_type_uuid (
          type,
          (CAST(JSON_EXTRACT(config, '$.UUID') AS CHAR(36)))
        );
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE RuleChainNode 
        ADD INDEX idx_rulechainnode_type_sensorUUID (
          type,
          (CAST(JSON_EXTRACT(config, '$.sensorUUID') AS CHAR(36)))
        );
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE RuleChainNode 
        ADD INDEX idx_rulechainnode_type_deviceUUID (
          type,
          (CAST(JSON_EXTRACT(config, '$.deviceUUID') AS CHAR(36)))
        );
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE RuleChainNode 
        ADD INDEX idx_rulechainnode_type_key (
          type,
          (CAST(JSON_EXTRACT(config, '$.key') AS CHAR(100)))
        );
      `, { transaction });

      await transaction.commit();
      console.log('✅ MySQL JSON indexes added to RuleChainNode table successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to add MySQL JSON indexes:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE RuleChainNode DROP INDEX idx_rulechainnode_type_sourceType;
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE RuleChainNode DROP INDEX idx_rulechainnode_type_uuid;
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE RuleChainNode DROP INDEX idx_rulechainnode_type_sensorUUID;
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE RuleChainNode DROP INDEX idx_rulechainnode_type_deviceUUID;
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE RuleChainNode DROP INDEX idx_rulechainnode_type_key;
      `, { transaction });

      await transaction.commit();
      console.log('✅ MySQL JSON indexes removed from RuleChainNode table successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to remove MySQL JSON indexes:', error.message);
      throw error;
    }
  }
};
