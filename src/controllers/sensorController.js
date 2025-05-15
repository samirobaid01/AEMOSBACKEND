const sensorService = require('../services/sensorService');
const { ApiError } = require('../middlewares/errorHandler');
const roleService = require('../services/roleService');

// SENSOR ENDPOINTS

// Get all sensors, filtered by organization
const getAllSensors = async (req, res, next) => {
  try {
    // Get organization ID from query
    const { organizationId } = req.query;
    console.log(`Getting all sensors for organization: ${organizationId}`);
    
    // Check if user is a System Admin
    const isSystemAdmin = await roleService.userIsSystemAdmin(req.user.id);
    
    let sensors;
    
    // If System Admin, get all sensors from the specified organization
    if (isSystemAdmin) {
      console.log(`User is System Admin, getting all sensors for org ${organizationId}`);
      sensors = await sensorService.getSensorsByOrganizations([organizationId]);
    } else {
      // Verify user has access to this organization
      const userOrgs = await roleService.getUserOrganizations(req.user.id);
      const orgIds = userOrgs.map(org => org.id);
      
      if (!orgIds.includes(Number(organizationId))) {
        console.log(`User ${req.user.id} does not have access to organization ${organizationId}`);
        return next(new ApiError(403, 'Forbidden: You do not have access to this organization'));
      }
      
      // Get sensors for the specified organization
      console.log(`Getting sensors for organization ${organizationId} for user ${req.user.id}`);
      sensors = await sensorService.getSensorsByOrganizations([organizationId]);
    }
    
    // Log success
    console.log(`Retrieved ${sensors.length} sensors for organization ${organizationId}`);
    
    res.status(200).json({
      status: 'success',
      results: sensors.length,
      data: { sensors }
    });
  } catch (error) {
    // Enhanced error logging
    console.error('Error in getAllSensors:', error.message);
    console.error(error.stack);
    next(error);
  }
};

// Get a single sensor by ID
const getSensorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;
    console.log(`Getting sensor by ID: ${id} for organization: ${organizationId}`);
    
    // Get the sensor
    const sensor = await sensorService.getSensorById(id);
    
    if (!sensor) {
      console.log(`Sensor with ID ${id} not found in controller`);
      return next(new ApiError(404, `Sensor with ID ${id} not found`));
    }
    
    // Note: Organization check is handled by the checkResourceOwnership middleware
    // We've already verified the sensor belongs to the organization at this point
    
    console.log(`Successfully found sensor: ${sensor.name}`);
    res.status(200).json({
      status: 'success',
      data: { sensor }
    });
  } catch (error) {
    console.error(`Error in getSensorById:`, error);
    next(error);
  }
};

// Get sensors by organization
const getSensorsByOrganization = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    const sensors = await sensorService.getSensorsByOrganization(organizationId);
    res.status(200).json({
      status: 'success',
      results: sensors.length,
      data: { sensors }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new sensor
const createSensor = async (req, res, next) => {
  try {
    const sensorData = req.body;
    const { organizationId, areaId } = req.body;
    
    console.log(`Creating sensor for organization: ${organizationId}`);
    
    // Create the sensor
    const sensor = await sensorService.createSensor(sensorData);
    
    // Create area-sensor association if areaId is provided
    if (areaId) {
      try {
        await sensorService.associateSensorWithArea(sensor.id, areaId);
        console.log(`Associated sensor ${sensor.id} with area ${areaId}`);
      } catch (assocError) {
        console.error(`Error associating sensor with area: ${assocError.message}`);
        // Continue even if association fails - the sensor was created
      }
    } else {
      console.warn(`No areaId provided for sensor ${sensor.id}. It won't be associated with any organization until assigned to an area.`);
    }
    
    res.status(201).json({
      status: 'success',
      data: { sensor }
    });
  } catch (error) {
    console.error(`Error in createSensor:`, error);
    next(error);
  }
};

// Update a sensor
const updateSensor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.body;
    
    console.log(`Updating sensor ${id} for organization: ${organizationId}`);
    
    // Note: Organization check is handled by the checkResourceOwnership middleware
    
    const sensor = await sensorService.updateSensor(id, req.body);
    
    if (!sensor) {
      return next(new ApiError(404, `Sensor with ID ${id} not found`));
    }
    
    res.status(200).json({
      status: 'success',
      data: { sensor }
    });
  } catch (error) {
    console.error(`Error in updateSensor:`, error);
    next(error);
  }
};

// Delete a sensor
const deleteSensor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;
    
    console.log(`Deleting sensor ${id} for organization: ${organizationId}`);
    
    // Note: Organization check is handled by the checkResourceOwnership middleware
    
    const result = await sensorService.deleteSensor(id);
    
    if (!result) {
      return next(new ApiError(404, `Sensor with ID ${id} not found`));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error(`Error in deleteSensor:`, error);
    next(error);
  }
};

// TELEMETRY DATA ENDPOINTS

// Get all telemetry data
const getAllTelemetryData = async (req, res, next) => {
  try {
    const telemetryData = await sensorService.getAllTelemetryData();
    res.status(200).json({
      status: 'success',
      results: telemetryData.length,
      data: {
        telemetryData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get telemetry data for a sensor
const getTelemetryDataBySensorId = async (req, res, next) => {
  try {
    const { sensorId } = req.params;
    const telemetryData = await sensorService.getTelemetryDataBySensorId(sensorId);

    res.status(200).json({
      status: 'success',
      results: telemetryData.length,
      data: {
        telemetryData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get a single telemetry data item by ID
const getTelemetryDataById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const telemetryData = await sensorService.getTelemetryDataById(id);

    if (!telemetryData) {
      return next(new ApiError(404, `Telemetry data with ID ${id} not found`));
    }

    res.status(200).json({
      status: 'success',
      data: {
        telemetryData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new telemetry data item
const createTelemetryData = async (req, res, next) => {
  try {
    console.log('inside createTelemetryData');
    console.log(req.body);
    const telemetryData = await sensorService.createTelemetryData(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        telemetryData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update a telemetry data item
const updateTelemetryData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const telemetryData = await sensorService.updateTelemetryData(id, req.body);

    if (!telemetryData) {
      return next(new ApiError(404, `Telemetry data with ID ${id} not found`));
    }

    res.status(200).json({
      status: 'success',
      data: {
        telemetryData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete a telemetry data item
const deleteTelemetryData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await sensorService.deleteTelemetryData(id);

    if (!result) {
      return next(new ApiError(404, `Telemetry data with ID ${id} not found`));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Sensor endpoints
  getAllSensors,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor,
  getSensorsByOrganization,
  // Telemetry data endpoints
  getAllTelemetryData,
  getTelemetryDataBySensorId,
  getTelemetryDataById,
  createTelemetryData,
  updateTelemetryData,
  deleteTelemetryData,
};
