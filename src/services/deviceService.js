const { Device, State } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { v4: uuidv4 } = require('uuid');

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

module.exports = {
  getAllDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice
}; 