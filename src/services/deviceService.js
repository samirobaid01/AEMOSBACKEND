const { Device, State } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../models/initModels');

// Get all devices
const getAllDevices = async () => {
  try {
    // Check if the association exists
    const hasAssociation = Device.associations && Device.associations.States;
    
    const query = {};
    
    // Only include the States if the association exists
    if (hasAssociation) {
      query.include = [
        {
          model: State,
          as: 'States'
        }
      ];
    }
    
    return await Device.findAll(query);
  } catch (error) {
    // Log the error and return an empty array instead of throwing
    console.error('Error in getAllDevices service:', error.message);
    return [];
  }
};

// Get a single device by ID
const getDeviceById = async (id) => {
  try {
    // Check if the association exists
    const hasAssociation = Device.associations && Device.associations.States;
    
    const query = {};
    
    // Only include the States if the association exists
    if (hasAssociation) {
      query.include = [
        {
          model: State,
          as: 'States'
        }
      ];
    }
    
    return await Device.findByPk(id, query);
  } catch (error) {
    console.error('Error in getDeviceById service:', error.message);
    return null;
  }
};

// Create a new device
const createDevice = async (deviceData) => {
  // Generate UUID if not provided
  if (!deviceData.uuid) {
    deviceData.uuid = uuidv4();
  }
  
  // Set timestamps if not provided
  const now = new Date();
  if (!deviceData.createdAt) {
    deviceData.createdAt = now;
  }
  if (!deviceData.updatedAt) {
    deviceData.updatedAt = now;
  }
  
  return await Device.create(deviceData);
};

// Update a device
const updateDevice = async (id, deviceData) => {
  // Update timestamp
  deviceData.updatedAt = new Date();
  
  const device = await Device.findByPk(id);
  
  if (!device) {
    return null;
  }
  
  await device.update(deviceData);
  return device;
};

// Delete a device
const deleteDevice = async (id) => {
  const device = await Device.findByPk(id);
  
  if (!device) {
    return false;
  }
  
  await device.destroy();
  return true;
};

/**
 * Check if a device has any area associations (for debugging purposes)
 * @param {Number} deviceId - The device ID to check
 * @returns {Promise<boolean>} True if device has area associations
 */
const checkDeviceHasAreaAssociations = async (deviceId) => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM AreaDevice
      WHERE deviceId = :deviceId
    `;
    
    const results = await sequelize.query(query, {
      replacements: { deviceId },
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log(`Device ${deviceId} area associations: ${results[0].count}`);
    return results[0].count > 0;
  } catch (error) {
    console.error('Error checking device area associations:', error.message);
    return false;
  }
};

/**
 * Get a device with its organization ID for ownership checking
 * This implementation finds the organization IDs through the Area-Device relationship
 * @param {Number} id - Device ID
 * @returns {Promise<Object>} Device with organizationId
 */
const getDeviceForOwnershipCheck = async (id) => {
  try {
    // First check if the device exists
    const device = await Device.findByPk(id);
    
    if (!device) {
      console.log(`Device with ID ${id} not found!`);
      return null; // Device doesn't exist
    }
    
    // DEBUG: Check if this device has any area associations
    const hasAreaAssociations = await checkDeviceHasAreaAssociations(id);
    console.log(`Device ${id} has area associations: ${hasAreaAssociations}`);
    
    // Find areas this device belongs to along with their organizations
    const query = `
      SELECT a.organizationId
      FROM AreaDevice ad
      JOIN Area a ON ad.areaId = a.id
      WHERE ad.deviceId = :deviceId
      LIMIT 1
    `;
    
    const results = await sequelize.query(query, {
      replacements: { deviceId: id },
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log(`Query results for device ${id} organization:`, results);
    
    if (results && results.length > 0 && results[0].organizationId) {
      console.log(`Found organization ${results[0].organizationId} for device ${id}`);
      return {
        id: device.id,
        organizationId: results[0].organizationId
      };
    }
    
    // If no organization found through area relationship, return device with null organizationId
    console.warn(`Device ${id} is not assigned to any area with an organization. Bypassing organization check.`);
    return {
      id: device.id,
      organizationId: null
    };
  } catch (error) {
    console.error('Error in getDeviceForOwnershipCheck:', error.message);
    return null;
  }
};

/**
 * Get devices by organization IDs using the Area-Device relationship
 * @param {Array} organizationIds - Array of organization IDs
 * @returns {Promise<Array>} Array of devices
 */
const getDevicesByOrganizations = async (organizationIds) => {
  try {
    if (!organizationIds || organizationIds.length === 0) {
      return [];
    }

    // Query to get devices from areas that belong to the specified organizations
    const query = `
      SELECT DISTINCT d.*
      FROM Device d
      JOIN AreaDevice ad ON d.id = ad.deviceId
      JOIN Area a ON ad.areaId = a.id
      WHERE a.organizationId IN (:organizationIds)
    `;
    
    const devices = await sequelize.query(query, {
      replacements: { organizationIds },
      type: sequelize.QueryTypes.SELECT,
      model: Device,
      mapToModel: true
    });
    
    return devices;
  } catch (error) {
    console.error('Error in getDevicesByOrganizations:', error.message);
    return [];
  }
};

module.exports = {
  getAllDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  getDeviceForOwnershipCheck,
  getDevicesByOrganizations
}; 