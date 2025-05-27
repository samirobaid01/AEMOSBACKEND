const { Device, AreaDevice, Area, DeviceState, DeviceStateInstance, sequelize } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

// Get all devices
const getAllDevices = async (includeInactive = false) => {
  try {
    const query = {};
    
    // Only include active devices by default
    if (!includeInactive) {
      query.where = {
        status: {
          [sequelize.Op.ne]: 'inactive'
        }
      };
    }
    
    // Include device states
    query.include = [{
      model: DeviceState,
      as: 'states',
      include: [{
        model: DeviceStateInstance,
        as: 'instances',
        where: {
          toTimestamp: null // Only get current state instance
        },
        required: false
      }]
    }];
    
    return await Device.findAll(query);
  } catch (error) {
    console.error('Error in getAllDevices service:', error.message);
    return [];
  }
};

// Get a single device by ID
const getDeviceById = async (id) => {
  try {
    const query = {
      include: [{
        model: DeviceState,
        as: 'states',
        include: [{
          model: DeviceStateInstance,
          as: 'instances',
          where: {
            toTimestamp: null // Only get current state instance
          },
          required: false
        }]
      }]
    };
    
    return await Device.findByPk(id, query);
  } catch (error) {
    console.error('Error in getDeviceById service:', error.message);
    return null;
  }
};

// Create a new device
const createDevice = async (deviceData) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Generate UUID if not provided
    deviceData.uuid = uuidv4();
    
    // Set timestamps if not provided
    const now = new Date();
    if (!deviceData.createdAt) {
      deviceData.createdAt = now;
    }
    if (!deviceData.updatedAt) {
      deviceData.updatedAt = now;
    }
    
    // Set default status if not provided
    if (!deviceData.status) {
      deviceData.status = 'pending';
    }
    
    // Create the device
    const device = await Device.create(deviceData, { transaction });
    
    // If we have a default state specified, create an initial state record
    if (deviceData.defaultState) {
      const deviceState = await DeviceState.create({
        deviceId: device.id,
        stateName: deviceData.defaultState,
        dataType: 'string',
        defaultValue: deviceData.deviceType === 'actuator' ? 'false' : ''
      }, { transaction });

      // Create initial state instance
      await DeviceStateInstance.create({
        deviceStateId: deviceState.id,
        value: deviceState.defaultValue,
        fromTimestamp: now,
        initiatedBy: 'system'
      }, { transaction });
    }
    
    await transaction.commit();
    return device;
  } catch (error) {
    await transaction.rollback();
    console.error('Error in createDevice service:', error.message);
    throw error;
  }
};

// Update a device
const updateDevice = async (id, deviceData) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Update timestamp
    deviceData.updatedAt = new Date();
    
    const device = await Device.findByPk(id);
    
    if (!device) {
      await transaction.rollback();
      return null;
    }
    
    await device.update(deviceData, { transaction });
    
    // If we're updating the default state, we might need to add a new state
    if (deviceData.defaultState && device.defaultState !== deviceData.defaultState) {
      const now = new Date();
      
      // Find or create the device state
      const [deviceState] = await DeviceState.findOrCreate({
        where: {
          deviceId: device.id,
          stateName: deviceData.defaultState
        },
        defaults: {
          dataType: 'string',
          defaultValue: device.deviceType === 'actuator' ? 'false' : ''
        },
        transaction
      });

      // Close any current state instances
      await DeviceStateInstance.update(
        { toTimestamp: now },
        {
          where: {
            deviceStateId: deviceState.id,
            toTimestamp: null
          },
          transaction
        }
      );

      // Create new state instance
      await DeviceStateInstance.create({
        deviceStateId: deviceState.id,
        value: deviceState.defaultValue,
        fromTimestamp: now,
        initiatedBy: 'system'
      }, { transaction });
    }
    
    await transaction.commit();
    return device;
  } catch (error) {
    await transaction.rollback();
    console.error('Error in updateDevice service:', error.message);
    throw error;
  }
};

// Delete a device
const deleteDevice = async (id) => {
  const device = await Device.findByPk(id);
  
  if (!device) {
    return false;
  }
  
  // Instead of deleting, set status to inactive
  await device.update({
    status: 'inactive',
    updatedAt: new Date()
  });
  return true;
};

/**
 * Associate a device with an area
 * @param {Number} deviceId - The device ID to associate
 * @param {Number} areaId - The area ID to associate the device with
 * @throws {ApiError} If the device or area is not found
 */
const associateDeviceWithArea = async (deviceId, areaId) => {
  const device = await Device.findByPk(deviceId);
  if (!device) {
    throw new ApiError(404, 'Device not found');
  }
  const area = await Area.findByPk(areaId);
  if (!area) {
    throw new ApiError(404, 'Area not found');
  }
  await AreaDevice.create({
    deviceId,
    areaId
  }); 
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
    
    // Use the direct SQL method to get the organization reliably
    const organizationId = await getDeviceOrganization(id);
    console.log(`Organization ID for device ${id}: ${organizationId}`);
    
    if (organizationId !== null) {
      return {
        id: device.id,
        organizationId: organizationId
      };
    }
    
    // If no organization found, return device with null organizationId
    console.warn(`Device ${id} is not assigned to any area with an organization. No organization association found.`);
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

    // Convert any string IDs to numbers
    const orgIds = organizationIds.map(id => Number(id));

    // Query to get devices from areas that belong to the specified organizations
    const query = `
      SELECT DISTINCT d.*
      FROM Device d
      JOIN AreaDevice ad ON d.id = ad.deviceId
      JOIN Area a ON ad.areaId = a.id
      WHERE a.organizationId IN (:organizationIds)
    `;
    
    const devices = await sequelize.query(query, {
      replacements: { organizationIds: orgIds },
      type: sequelize.QueryTypes.SELECT,
      model: Device,
      mapToModel: true
    });
    
    // Fetch current states for each device
    const deviceIds = devices.map(d => d.id);
    
    if (deviceIds.length > 0) {
      // Get current state instances for all devices
      const deviceStates = await DeviceState.findAll({
        where: {
          deviceId: { [Op.in]: deviceIds }
        },
        include: [{
          model: DeviceStateInstance,
          as: 'instances',
          required: false
        }]
      });

      // Add states to devices
      devices.forEach(device => {
        device.states = deviceStates.filter(state => state.deviceId === device.id);
      });
    }
    
    console.log(`Found ${devices.length} devices for organizations: ${orgIds.join(', ')}`);
    return devices;
  } catch (error) {
    console.error('Error in getDevicesByOrganizations:', error.message);
    return [];
  }
};

/**
 * Get devices by a single organization ID
 * @param {Number} organizationId - Organization ID
 * @returns {Promise<Array>} Array of devices
 */
const getDevicesByOrganization = async (organizationId) => {
  if (!organizationId) {
    return [];
  }
  return getDevicesByOrganizations([organizationId]);
};

/**
 * Check if a device belongs to a specified organization
 * @param {Number} deviceId - Device ID
 * @param {Number} organizationId - Organization ID
 * @returns {Promise<Boolean>} True if device belongs to organization
 */
const deviceBelongsToOrganization = async (deviceId, organizationId) => {
  try {
    // First check if the device exists
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return false;
    }

    // Check if device belongs to the organization via Area
    const query = `
      SELECT COUNT(*) as count
      FROM AreaDevice ad
      JOIN Area a ON ad.areaId = a.id
      WHERE ad.deviceId = :deviceId AND a.organizationId = :organizationId
    `;
    
    const results = await sequelize.query(query, {
      replacements: { 
        deviceId: Number(deviceId), 
        organizationId: Number(organizationId) 
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    return results[0].count > 0;
  } catch (error) {
    console.error(`Error in deviceBelongsToOrganization:`, error);
    return false;
  }
};

// Link the specialized check function to the getDeviceForOwnershipCheck function
getDeviceForOwnershipCheck.resourceBelongsToOrganization = deviceBelongsToOrganization;

/**
 * Get the organization ID for a device using direct SQL
 * A more reliable method to get the organization a device belongs to
 * @param {Number} deviceId - Device ID
 * @returns {Promise<Number|null>} Organization ID or null if not found
 */
const getDeviceOrganization = async (deviceId) => {
  try {
    // Query to get the organization directly via SQL
    const query = `
      SELECT a.organizationId
      FROM AreaDevice ad
      JOIN Area a ON ad.areaId = a.id
      WHERE ad.deviceId = :deviceId
      LIMIT 1
    `;
    
    const results = await sequelize.query(query, {
      replacements: { deviceId: Number(deviceId) },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (results && results.length > 0 && results[0].organizationId) {
      return Number(results[0].organizationId);
    }
    
    return null;
  } catch (error) {
    console.error(`Error in getDeviceOrganization: ${error.message}`);
    return null;
  }
};

module.exports = {
  getAllDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  getDeviceForOwnershipCheck,
  associateDeviceWithArea,
  checkDeviceHasAreaAssociations,
  getDeviceOrganization,
  getDevicesByOrganizations,
  getDevicesByOrganization,
  deviceBelongsToOrganization,
  getDeviceOrganization
}; 