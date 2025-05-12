const { Sensor, TelemetryData } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { v4: uuidv4 } = require('uuid');

// SENSOR OPERATIONS

// Get all sensors
const getAllSensors = async () => {
  try {
    // Check if the association exists
    const hasAssociation = Sensor.associations && Sensor.associations.TelemetryData;
    
    const query = {};
    
    // Only include the TelemetryData if the association exists
    if (hasAssociation) {
      query.include = [
        {
          model: TelemetryData,
          as: 'TelemetryData'
        }
      ];
    }
    
    return await Sensor.findAll(query);
  } catch (error) {
    // Log the error and return an empty array instead of throwing
    console.error('Error in getAllSensors service:', error.message);
    return [];
  }
};

// Get a single sensor by ID
const getSensorById = async (id) => {
  return await Sensor.findByPk(id, {
    include: [
      {
        model: TelemetryData,
        as: 'TelemetryData'
      }
    ]
  });
};

// Create a new sensor
const createSensor = async (sensorData) => {
  // Generate UUID if not provided
  if (!sensorData.uuid) {
    sensorData.uuid = uuidv4();
  }
  
  // Set timestamps if not provided
  const now = new Date();
  if (!sensorData.createdAt) {
    sensorData.createdAt = now;
  }
  if (!sensorData.updatedAt) {
    sensorData.updatedAt = now;
  }
  
  return await Sensor.create(sensorData);
};

// Update a sensor
const updateSensor = async (id, sensorData) => {
  // Update timestamp
  sensorData.updatedAt = new Date();
  
  const sensor = await Sensor.findByPk(id);
  
  if (!sensor) {
    return null;
  }
  
  await sensor.update(sensorData);
  return sensor;
};

// Delete a sensor
const deleteSensor = async (id) => {
  const sensor = await Sensor.findByPk(id);
  
  if (!sensor) {
    return false;
  }
  
  await sensor.destroy();
  return true;
};

// TELEMETRY DATA OPERATIONS

// Get all telemetry data
const getAllTelemetryData = async () => {
  return await TelemetryData.findAll({
    include: [
      {
        model: Sensor,
        as: 'Sensor'
      }
    ]
  });
};

// Get telemetry data for a sensor
const getTelemetryDataBySensorId = async (sensorId) => {
  return await TelemetryData.findAll({
    where: {
      sensorId
    }
  });
};

// Get a single telemetry data item by ID
const getTelemetryDataById = async (id) => {
  return await TelemetryData.findByPk(id, {
    include: [
      {
        model: Sensor,
        as: 'Sensor'
      }
    ]
  });
};

// Create a new telemetry data item
const createTelemetryData = async (telemetryData) => {
  return await TelemetryData.create(telemetryData);
};

// Update a telemetry data item
const updateTelemetryData = async (id, telemetryData) => {
  const telemetryDataItem = await TelemetryData.findByPk(id);
  
  if (!telemetryDataItem) {
    return null;
  }
  
  await telemetryDataItem.update(telemetryData);
  return telemetryDataItem;
};

// Delete a telemetry data item
const deleteTelemetryData = async (id) => {
  const telemetryDataItem = await TelemetryData.findByPk(id);
  
  if (!telemetryDataItem) {
    return false;
  }
  
  await telemetryDataItem.destroy();
  return true;
};

module.exports = {
  // Sensor operations
  getAllSensors,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor,
  
  // Telemetry data operations
  getAllTelemetryData,
  getTelemetryDataBySensorId,
  getTelemetryDataById,
  createTelemetryData,
  updateTelemetryData,
  deleteTelemetryData
}; 