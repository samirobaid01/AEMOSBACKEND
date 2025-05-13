const { Sensor, TelemetryData, Area, AreaSensor } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

// SENSOR OPERATIONS

// Get all sensors
const getAllSensors = async (includeInactive = false) => {
  try {
    // Check if the association exists
    const hasAssociation = Sensor.associations && Sensor.associations.TelemetryData;
    
    const query = {};
    
    // Only include active sensors by default
    if (!includeInactive) {
      query.where = {
        status: {
          [Op.ne]: 'inactive'
        }
      };
    }
    
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
    
    return await Sensor.findByPk(id, query);
  } catch (error) {
    console.error('Error in getSensorById service:', error.message);
    throw new ApiError(500, 'Unable to fetch sensor: ' + error.message);
  }
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
  
  // Set default status if not provided
  if (!sensorData.status) {
    sensorData.status = 'pending';
  }
  
  return await Sensor.create(sensorData);
};

/**
 * Associate a sensor with an area in the AreaSensor join table
 * @param {Number} sensorId - Sensor ID
 * @param {Number} areaId - Area ID
 * @returns {Promise<Object>} The created association
 */
const associateSensorWithArea = async (sensorId, areaId) => {
  try {
    // Validate that both sensor and area exist
    const sensor = await Sensor.findByPk(sensorId);
    if (!sensor) {
      throw new Error(`Sensor with ID ${sensorId} not found`);
    }
    
    const area = await Area.findByPk(areaId);
    if (!area) {
      throw new Error(`Area with ID ${areaId} not found`);
    }
    
    // Create the association
    return await AreaSensor.create({
      sensorId: Number(sensorId),
      areaId: Number(areaId),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error(`Error in associateSensorWithArea: ${error.message}`);
    throw error;
  }
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
  
  // Instead of deleting, set status to inactive
  await sensor.update({
    status: 'inactive',
    updatedAt: new Date()
  });
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
 * Get the organization ID for a sensor using direct SQL
 * A more reliable method to get the organization a sensor belongs to
 * @param {Number} sensorId - Sensor ID
 * @returns {Promise<Number|null>} Organization ID or null if not found
 */
const getSensorOrganization = async (sensorId) => {
  try {
    // Use direct SQL query instead of model associations
    const query = `
      SELECT a.organizationId
      FROM AreaSensor as_rel
      JOIN Area a ON as_rel.areaId = a.id
      WHERE as_rel.sensorId = ?
      LIMIT 1
    `;
    
    const results = await sequelize.query(query, {
      replacements: [Number(sensorId)],
      type: sequelize.QueryTypes.SELECT
    });
    
    if (results && results.length > 0 && results[0].organizationId) {
      return Number(results[0].organizationId);
    }
    
    return null;
  } catch (error) {
    console.error(`Error in getSensorOrganization: ${error.message}`);
    return null;
  }
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
      console.log(`Sensor with ID ${id} not found!`);
      return null; // Sensor doesn't exist
    }
    
    // Get organization by direct SQL for reliability
    const query = `
      SELECT a.organizationId
      FROM AreaSensor as_rel
      JOIN Area a ON as_rel.areaId = a.id
      WHERE as_rel.sensorId = ?
      LIMIT 1
    `;
    
    const results = await sequelize.query(query, {
      replacements: [Number(id)],
      type: sequelize.QueryTypes.SELECT
    });
    
    let organizationId = null;
    if (results && results.length > 0 && results[0].organizationId) {
      organizationId = Number(results[0].organizationId);
      console.log(`Organization ID for sensor ${id}: ${organizationId}`);
      
      return {
        id: sensor.id,
        organizationId: organizationId
      };
    }
    
    // If no organization found, return sensor with null organizationId
    console.warn(`Sensor ${id} is not assigned to any area with an organization. No organization association found.`);
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
 * Check if a sensor belongs to a specified organization
 * @param {Number} sensorId - Sensor ID
 * @param {Number} organizationId - Organization ID
 * @returns {Promise<Boolean>} True if sensor belongs to organization
 */
const sensorBelongsToOrganization = async (sensorId, organizationId) => {
  try {
    // First check if the sensor exists
    const sensor = await Sensor.findByPk(sensorId);
    if (!sensor) {
      return false;
    }

    // Use direct SQL to check organizational ownership
    const query = `
      SELECT COUNT(*) as count
      FROM AreaSensor as_rel
      JOIN Area a ON as_rel.areaId = a.id
      WHERE as_rel.sensorId = ? AND a.organizationId = ?
    `;
    
    const results = await sequelize.query(query, {
      replacements: [Number(sensorId), Number(organizationId)],
      type: sequelize.QueryTypes.SELECT
    });
    
    return results[0].count > 0;
  } catch (error) {
    console.error(`Error in sensorBelongsToOrganization:`, error);
    return false;
  }
};

// Attach the cross-organization check function to make it available for checkResourceOwnership
getSensorForOwnershipCheck.resourceBelongsToOrganization = sensorBelongsToOrganization;

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

    // Convert any string IDs to numbers
    const orgIds = organizationIds.map(id => Number(id));

    // Use direct SQL query for reliability
    const query = `
      SELECT DISTINCT s.*
      FROM Sensor s
      JOIN AreaSensor as_rel ON s.id = as_rel.sensorId
      JOIN Area a ON as_rel.areaId = a.id
      WHERE a.organizationId IN (?)
    `;
    
    const results = await sequelize.query(query, {
      replacements: [orgIds],
      type: sequelize.QueryTypes.SELECT,
      model: Sensor,
      mapToModel: true
    });
    
    console.log(`Found ${results.length} sensors for organizations: ${orgIds.join(', ')}`);
    return results;
  } catch (error) {
    console.error('Error in getSensorsByOrganizations:', error.message);
    return [];
  }
};

/**
 * Get sensors by a single organization ID
 * @param {Number} organizationId - Organization ID
 * @returns {Promise<Array>} Array of sensors
 */
const getSensorsByOrganization = async (organizationId) => {
  if (!organizationId) {
    return [];
  }
  return getSensorsByOrganizations([organizationId]);
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
  
  // Organization-related operations
  getSensorForOwnershipCheck,
  getSensorsByOrganizations,
  getSensorsByOrganization,
  sensorBelongsToOrganization,
  getSensorOrganization,
  associateSensorWithArea
}; 