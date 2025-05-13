const deviceService = require('../services/deviceService');
const { ApiError } = require('../middlewares/errorHandler');
const roleService = require('../services/roleService');

// Get all devices, filtered by organization
const getAllDevices = async (req, res, next) => {
  try {
    // Get organization ID from query
    const { organizationId } = req.query;
    console.log(`Getting all devices for organization: ${organizationId}`);
    
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(req.user.id);
    
    let devices;
    
    // If System Admin, get all devices from the specified organization
    if (isSystemAdmin) {
      console.log(`User is System Admin, getting all devices for org ${organizationId}`);
      devices = await deviceService.getDevicesByOrganizations([organizationId]);
    } else {
      // Verify user has access to this organization
      const userOrgs = await roleService.getUserOrganizations(req.user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        console.log(`User ${req.user.id} does not have access to organization ${organizationId}`);
        return next(new ApiError(403, 'Forbidden: You do not have access to this organization'));
      }
      
      // Get devices for the specified organization
      console.log(`Getting devices for organization ${organizationId} for user ${req.user.id}`);
      devices = await deviceService.getDevicesByOrganizations([organizationId]);
    }
    
    // Log success
    console.log(`Retrieved ${devices.length} devices for organization ${organizationId}`);
    
    res.status(200).json({
      status: 'success',
      results: devices.length,
      data: { devices }
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
    const { organizationId } = req.query;
    console.log(`Getting device by ID: ${id} for organization: ${organizationId}`);
    
    // Get the device
    const device = await deviceService.getDeviceById(id);
    
    if (!device) {
      console.log(`Device with ID ${id} not found in controller`);
      return next(new ApiError(404, `Device with ID ${id} not found`));
    }
    
    // Note: Organization check is handled by the checkResourceOwnership middleware
    // We've already verified the device belongs to the organization at this point
    
    console.log(`Successfully found device: ${device.name}`);
    res.status(200).json({
      status: 'success',
      data: { device }
    });
  } catch (error) {
    console.error(`Error in getDeviceById:`, error);
    next(error);
  }
};

// Create a new device
const createDevice = async (req, res, next) => {
  try {
    const deviceData = req.body;
    const { organizationId } = req.body;
    
    console.log(`Creating device for organization: ${organizationId}`);
    
    // Create the device
    const device = await deviceService.createDevice(deviceData);
    
    // TODO: Create area-device association
    // This will require:
    // 1. Either requiring an areaId in the request
    // 2. Or creating a default area for the device
    
    res.status(201).json({
      status: 'success',
      data: { device }
    });
  } catch (error) {
    console.error(`Error in createDevice:`, error);
    next(error);
  }
};

// Update a device
const updateDevice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.body;
    
    console.log(`Updating device ${id} for organization: ${organizationId}`);
    
    // Note: Organization check is handled by the checkResourceOwnership middleware
    
    const device = await deviceService.updateDevice(id, req.body);
    
    if (!device) {
      return next(new ApiError(404, `Device with ID ${id} not found`));
    }
    
    res.status(200).json({
      status: 'success',
      data: { device }
    });
  } catch (error) {
    console.error(`Error in updateDevice:`, error);
    next(error);
  }
};

// Delete a device
const deleteDevice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;
    
    console.log(`Deleting device ${id} for organization: ${organizationId}`);
    
    // Note: Organization check is handled by the checkResourceOwnership middleware
    
    const result = await deviceService.deleteDevice(id);
    
    if (!result) {
      return next(new ApiError(404, `Device with ID ${id} not found`));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error(`Error in deleteDevice:`, error);
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