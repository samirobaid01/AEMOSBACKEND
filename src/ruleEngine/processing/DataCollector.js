const { Sensor, Device, TelemetryData, DataStream, DeviceState, DeviceStateInstance } = require('../../models/initModels');
const logger = require('../../utils/logger');

/**
 * Data Collector - Efficiently collects sensor and device data for rule execution
 * Optimizes data fetching by only collecting what's needed
 */
class DataCollector {
  constructor() {
    this.cacheTimeout = 5000; // 5 seconds cache for data
    this.dataCache = new Map();
    
    this.collectionStats = {
      totalCollections: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageCollectionTime: 0,
      lastCollectedAt: null
    };
    
    logger.info('DataCollector initialized');
  }

  /**
   * Collect all required data for rule chains
   * @param {Array} ruleChainIds 
   * @param {number} organizationId 
   * @param {Array} entityUuids - Optional filter for specific entities
   */
  async collectAllRequiredData(ruleChainIds, organizationId, entityUuids = null) {
    const startTime = Date.now();
    
    try {
      // Extract data requirements from rule chains
      const requirements = await this._extractDataRequirements(ruleChainIds);
      
      // Filter by entityUuids if provided
      if (entityUuids && entityUuids.length > 0) {
        requirements.sensors = requirements.sensors.filter(uuid => entityUuids.includes(uuid));
        requirements.devices = requirements.devices.filter(uuid => entityUuids.includes(uuid));
      }
      
      // Collect data in parallel
      const [sensorData, deviceData] = await Promise.all([
        this._collectSensorData(requirements.sensors, organizationId),
        this._collectDeviceData(requirements.devices, organizationId)
      ]);
      
      // Update statistics
      this._updateStats(startTime);
      
      return {
        sensorData,
        deviceData,
        metadata: {
          collectionTime: Date.now() - startTime,
          sensorsCollected: sensorData.length,
          devicesCollected: deviceData.length,
          totalRequiredSensors: requirements.sensors.length,
          totalRequiredDevices: requirements.devices.length
        }
      };
    } catch (error) {
      logger.error('Error collecting data:', error);
      throw error;
    }
  }

  /**
   * Collect latest sensor data with caching
   * @param {Array} sensorUuids 
   * @param {number} organizationId 
   */
  async _collectSensorData(sensorUuids, organizationId) {
    const sensorData = [];
    const uncachedUuids = [];
    
    // Check cache first
    for (const uuid of sensorUuids) {
      const cacheKey = `sensor:${uuid}`;
      const cachedData = this._getCachedData(cacheKey);
      
      if (cachedData) {
        sensorData.push(cachedData);
        this.collectionStats.cacheHits++;
      } else {
        uncachedUuids.push(uuid);
        this.collectionStats.cacheMisses++;
      }
    }
    
    // Fetch uncached data
    if (uncachedUuids.length > 0) {
      const freshData = await this._fetchSensorData(uncachedUuids, organizationId);
      sensorData.push(...freshData);
      
      // Cache the fresh data
      freshData.forEach(data => {
        this._setCachedData(`sensor:${data.UUID}`, data);
      });
    }
    
    return sensorData;
  }

  /**
   * Collect latest device state data with caching
   * @param {Array} deviceUuids 
   * @param {number} organizationId 
   */
  async _collectDeviceData(deviceUuids, organizationId) {
    const deviceData = [];
    const uncachedUuids = [];
    
    // Check cache first
    for (const uuid of deviceUuids) {
      const cacheKey = `device:${uuid}`;
      const cachedData = this._getCachedData(cacheKey);
      
      if (cachedData) {
        deviceData.push(cachedData);
        this.collectionStats.cacheHits++;
      } else {
        uncachedUuids.push(uuid);
        this.collectionStats.cacheMisses++;
      }
    }
    
    // Fetch uncached data
    if (uncachedUuids.length > 0) {
      const freshData = await this._fetchDeviceData(uncachedUuids, organizationId);
      deviceData.push(...freshData);
      
      // Cache the fresh data
      freshData.forEach(data => {
        this._setCachedData(`device:${data.UUID}`, data);
      });
    }
    
    return deviceData;
  }

  /**
   * Fetch fresh sensor data from database
   * @param {Array} sensorUuids 
   * @param {number} organizationId 
   */
  async _fetchSensorData(sensorUuids, organizationId) {
    const sensorData = [];
    
    try {
      // Get sensors in batch
      const sensors = await Sensor.findAll({
        where: { 
          UUID: sensorUuids,
          organizationId 
        },
        include: [{
          model: TelemetryData,
          as: 'telemetryData'
        }]
      });
      
      // For each sensor, get latest telemetry data
      for (const sensor of sensors) {
        const sensorDataObject = { UUID: sensor.uuid };
        
        if (sensor.telemetryData && sensor.telemetryData.length > 0) {
          // Get latest data streams for each telemetry parameter
          for (const telemetry of sensor.telemetryData) {
            const latestStream = await DataStream.findOne({
              where: { telemetryDataId: telemetry.id },
              order: [['recievedAt', 'DESC']],
              limit: 1
            });
            
            if (latestStream) {
              // Convert value based on datatype
              let value = latestStream.value;
              switch (telemetry.datatype) {
                case 'number':
                  value = Number(value);
                  break;
                case 'boolean':
                  value = value.toLowerCase() === 'true';
                  break;
                // String and other types remain as is
              }
              
              sensorDataObject[telemetry.variableName] = value;
              sensorDataObject.timestamp = latestStream.recievedAt;
            }
          }
        }
        
        // Only add if we have data beyond just UUID
        if (Object.keys(sensorDataObject).length > 1) {
          sensorData.push(sensorDataObject);
        }
      }
    } catch (error) {
      logger.error('Error fetching sensor data:', error);
      throw error;
    }
    
    return sensorData;
  }

  /**
   * Fetch fresh device data from database
   * @param {Array} deviceUuids 
   * @param {number} organizationId 
   */
  async _fetchDeviceData(deviceUuids, organizationId) {
    const deviceData = [];
    
    try {
      // Get devices in batch
      const devices = await Device.findAll({
        where: { 
          UUID: deviceUuids,
          organizationId 
        },
        include: [{
          model: DeviceState,
          as: 'deviceStates'
        }]
      });
      
      // For each device, get latest state data
      for (const device of devices) {
        const deviceDataObject = { UUID: device.UUID };
        
        if (device.deviceStates && device.deviceStates.length > 0) {
          // Get latest state instances for each state
          for (const state of device.deviceStates) {
            const latestInstance = await DeviceStateInstance.findOne({
              where: { deviceStateId: state.id },
              order: [['fromTimestamp', 'DESC']],
              limit: 1
            });
            
            if (latestInstance) {
              deviceDataObject[state.stateName] = latestInstance.value;
              deviceDataObject.timestamp = latestInstance.fromTimestamp;
            }
          }
        }
        
        // Only add if we have data beyond just UUID
        if (Object.keys(deviceDataObject).length > 1) {
          deviceData.push(deviceDataObject);
        }
      }
    } catch (error) {
      logger.error('Error fetching device data:', error);
      throw error;
    }
    
    return deviceData;
  }

  /**
   * Extract data requirements from rule chains
   * This would ideally use the RuleChainIndex's cached configurations
   * @param {Array} ruleChainIds 
   */
  async _extractDataRequirements(ruleChainIds) {
    const requirements = {
      sensors: new Set(),
      devices: new Set()
    };
    
    // This is a simplified version - in practice, we'd use the cached
    // rule configurations from RuleChainIndex to avoid database queries
    
    // For now, return empty requirements since we handle this in the processing layer
    // This method would be enhanced to parse rule configurations and extract
    // the actual sensor/device UUIDs needed
    
    return {
      sensors: Array.from(requirements.sensors),
      devices: Array.from(requirements.devices)
    };
  }

  /**
   * Get cached data with expiration check
   * @param {string} key 
   */
  _getCachedData(key) {
    const cached = this.dataCache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.dataCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set data in cache with timestamp
   * @param {string} key 
   * @param {any} data 
   */
  _setCachedData(key, data) {
    this.dataCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear expired cache entries
   */
  _cleanupCache() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, value] of this.dataCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.dataCache.delete(key));
  }

  /**
   * Update collection statistics
   * @param {number} startTime 
   */
  _updateStats(startTime) {
    this.collectionStats.totalCollections++;
    this.collectionStats.lastCollectedAt = new Date();
    
    const collectionTime = Date.now() - startTime;
    this.collectionStats.averageCollectionTime = 
      ((this.collectionStats.averageCollectionTime * (this.collectionStats.totalCollections - 1)) + collectionTime) / 
      this.collectionStats.totalCollections;
  }

  /**
   * Get collection statistics
   */
  getStats() {
    const cacheHitRate = this.collectionStats.totalCollections > 0 ? 
      (this.collectionStats.cacheHits / (this.collectionStats.cacheHits + this.collectionStats.cacheMisses)) * 100 : 0;
    
    return {
      ...this.collectionStats,
      cacheSize: this.dataCache.size,
      cacheHitRate: cacheHitRate.toFixed(2) + '%'
    };
  }

  /**
   * Clear cache and reset statistics
   */
  reset() {
    this.dataCache.clear();
    this.collectionStats = {
      totalCollections: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageCollectionTime: 0,
      lastCollectedAt: null
    };
  }

  /**
   * Start periodic cache cleanup
   */
  startCacheCleanup() {
    setInterval(() => {
      this._cleanupCache();
    }, this.cacheTimeout);
  }
}

module.exports = DataCollector; 