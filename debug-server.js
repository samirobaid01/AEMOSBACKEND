'use strict';

require('dotenv').config();
const { Device, sequelize } = require('./src/models/initModels');

async function debugServer() {
  try {
    console.log('Starting debug server...');
    
    // Test database connection
    try {
      await sequelize.authenticate();
      console.log('Database connection successful!');
    } catch (error) {
      console.error('Database connection failed:', error);
      process.exit(1);
    }
    
    // Check device 4
    try {
      const device = await Device.findByPk(4);
      console.log('Device 4 data:', device ? device.toJSON() : null);
    } catch (error) {
      console.error('Error retrieving device 4:', error);
    }
    
    // Check area device relationship
    try {
      const query = `
        SELECT ad.*, a.organizationId 
        FROM AreaDevice ad 
        JOIN Area a ON ad.areaId = a.id 
        WHERE ad.deviceId = 4
      `;
      const results = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT
      });
      console.log('Area relationship for device 4:', results);
    } catch (error) {
      console.error('Error retrieving area relationship:', error);
    }
    
    // Check user organization
    try {
      const query = `
        SELECT ou.*, r.name as roleName 
        FROM OrganizationUser ou 
        JOIN Role r ON ou.role = r.id 
        WHERE ou.userId = 79
      `;
      const results = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT
      });
      console.log('User 79 organization info:', results);
    } catch (error) {
      console.error('Error retrieving user organization info:', error);
    }
    
    console.log('Debug complete!');
    process.exit(0);
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
}

// Run the debug server
debugServer(); 