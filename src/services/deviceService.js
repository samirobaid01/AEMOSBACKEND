const { Device, State } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { v4: uuidv4 } = require('uuid');

// Get all devices
const getAllDevices = async () => {
  return await Device.findAll({
    include: [
      {
        model: State,
        as: 'States'
      }
    ]
  });
};

// Get a single device by ID
const getDeviceById = async (id) => {
  return await Device.findByPk(id, {
    include: [
      {
        model: State,
        as: 'States'
      }
    ]
  });
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