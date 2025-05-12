const { Sensor, TelemetryData } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

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

/**
 * Get a sensor with its organization ID for ownership checking
 * This implementation finds the organization IDs through the Area-Sensor relationship
 * @param {Number} id - Sensor ID
 * @returns {Promise<Object>} Sensor with organizationId
 */
const getSensorForOwnershipCheck = async (id) => {
  try {
    // First check if the sensor exists
    const sensor = await Sensor.findByPk(id);
    
    if (!sensor) {
      return null; // Sensor doesn't exist
    }
    
    // Find areas this sensor belongs to along with their organizations
    const query = `
      SELECT a.organizationId
      FROM AreaSensor as_rel
      JOIN Area a ON as_rel.areaId = a.id
      WHERE as_rel.sensorId = :sensorId
      LIMIT 1
    `;
    
    const results = await sequelize.query(query, {
      replacements: { sensorId: id },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (results && results.length > 0 && results[0].organizationId) {
      return {
        id: sensor.id,
        organizationId: results[0].organizationId
      };
    }
    
    // If no organization found through area relationship, return sensor with null organizationId
    console.warn(`Sensor ${id} is not assigned to any area with an organization. Bypassing organization check.`);
    return {
      id: sensor.id,
      organizationId: null
    };
  } catch (error) {
    console.error('Error in getSensorForOwnershipCheck:', error.message);
    return null;
  }
};

/**
 * Get sensors by organization IDs using the Area-Sensor relationship
 * @param {Array} organizationIds - Array of organization IDs
 * @returns {Promise<Array>} Array of sensors
 */
const getSensorsByOrganizations = async (organizationIds) => {
  try {
    if (!organizationIds || organizationIds.length === 0) {
      return [];
    }

    // Query to get sensors from areas that belong to the specified organizations
    const query = `
      SELECT DISTINCT s.*
      FROM Sensor s
      JOIN AreaSensor as_rel ON s.id = as_rel.sensorId
      JOIN Area a ON as_rel.areaId = a.id
      WHERE a.organizationId IN (:organizationIds)
    `;
    
    const sensors = await sequelize.query(query, {
      replacements: { organizationIds },
      type: sequelize.QueryTypes.SELECT,
      model: Sensor,
      mapToModel: true
    });
    
    return sensors;
  } catch (error) {
    console.error('Error in getSensorsByOrganizations:', error.message);
    return [];
  }
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
  deleteTelemetryData,
  
  getSensorForOwnershipCheck,
  getSensorsByOrganizations
}; 