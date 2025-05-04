const sensorService = require('../services/sensorService');
const { ApiError } = require('../middlewares/errorHandler');

// SENSOR ENDPOINTS

// Get all sensors
const getAllSensors = async (req, res, next) => {
  try {
    const sensors = await sensorService.getAllSensors();
    res.status(200).json({
      status: 'success',
      results: sensors.length,
      data: {
        sensors
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single sensor by ID
const getSensorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sensor = await sensorService.getSensorById(id);
    
    if (!sensor) {
      return next(new ApiError(404, `Sensor with ID ${id} not found`));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        sensor
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new sensor
const createSensor = async (req, res, next) => {
  try {
    const sensor = await sensorService.createSensor(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        sensor
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a sensor
const updateSensor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sensor = await sensorService.updateSensor(id, req.body);
    
    if (!sensor) {
      return next(new ApiError(404, `Sensor with ID ${id} not found`));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        sensor
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a sensor
const deleteSensor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await sensorService.deleteSensor(id);
    
    if (!result) {
      return next(new ApiError(404, `Sensor with ID ${id} not found`));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
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
        telemetryData
      }
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
        telemetryData
      }
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
        telemetryData
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new telemetry data item
const createTelemetryData = async (req, res, next) => {
  try {
    const telemetryData = await sensorService.createTelemetryData(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        telemetryData
      }
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
        telemetryData
      }
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
      data: null
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
  
  // Telemetry data endpoints
  getAllTelemetryData,
  getTelemetryDataBySensorId,
  getTelemetryDataById,
  createTelemetryData,
  updateTelemetryData,
  deleteTelemetryData
}; 