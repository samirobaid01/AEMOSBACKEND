const deviceService = require('../services/deviceService');
const { ApiError } = require('../middlewares/errorHandler');

// Get all devices
const getAllDevices = async (req, res, next) => {
  try {
    // Log that we're about to query devices
    console.log('Querying all devices');
    
    // Add debugging information
    console.log('User:', req.user);
    
    const devices = await deviceService.getAllDevices();
    
    // Log success
    console.log(`Retrieved ${devices.length} devices`);
    
    res.status(200).json({
      status: 'success',
      results: devices.length,
      data: {
        devices
      }
    });
  } catch (error) {
    // Enhanced error logging
    console.error('Error in getAllDevices:', error.message);
    console.error(error.stack);
    next(error);
  }
};

// Get a single device by ID
const getDeviceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const device = await deviceService.getDeviceById(id);
    
    if (!device) {
      return next(new ApiError(404, `Device with ID ${id} not found`));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        device
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new device
const createDevice = async (req, res, next) => {
  try {
    const device = await deviceService.createDevice(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        device
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a device
const updateDevice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const device = await deviceService.updateDevice(id, req.body);
    
    if (!device) {
      return next(new ApiError(404, `Device with ID ${id} not found`));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        device
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a device
const deleteDevice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deviceService.deleteDevice(id);
    
    if (!result) {
      return next(new ApiError(404, `Device with ID ${id} not found`));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice
}; 