const dataStreamService = require('../services/dataStreamService');
const { ApiError } = require('../middlewares/errorHandler');
const notificationManager = require('../utils/notificationManager');
const config = require('../config');
const TelemetryData = require('../models/TelemetryData');
const DataStream = require('../models/DataStream');
const logger = require('../utils/logger');
const socketManager = require('../utils/socketManager');
const ruleEngineEventBus = require('../ruleEngine/core/RuleEngineEventBus');
const mqttPublisher = require('../services/mqttPublisherService');
const coapPublisher = require('../services/coapPublisherService');
const Sensor = require('../models/Sensor');
// Get all data streams
const getAllDataStreams = async (req, res, next) => {
  try {
    const dataStreams = await dataStreamService.getAllDataStreams();
    res.status(200).json({
      status: 'success',
      results: dataStreams.length,
      data: {
        dataStreams,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get a single data stream by ID
const getDataStreamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dataStream = await dataStreamService.getDataStreamById(id);

    if (!dataStream) {
      return next(new ApiError(404, `Data stream with ID ${id} not found`));
    }

    res.status(200).json({
      status: 'success',
      data: {
        dataStream,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get data streams for a telemetry data item
const getDataStreamsByTelemetryId = async (req, res, next) => {
  try {
    const { telemetryDataId } = req.params;
    const dataStreams = await dataStreamService.getDataStreamsByTelemetryId(telemetryDataId);

    res.status(200).json({
      status: 'success',
      results: dataStreams.length,
      data: {
        dataStreams,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new data stream
const createDataStream = async (req, res, next) => {
  try {
    const dataStream = await dataStreamService.createDataStream(req.body);

    // Send response immediately
    res.status(201).json({
      status: 'success',
      data: {
        dataStream,
      },
    });

    // Queue notification asynchronously (after response sent)
    process.nextTick(() => {
      // Determine priority based on business rules
      // For example, if there's an 'urgent' flag or value exceeds thresholds
      const isPriority = req.body.urgent === true || 
                        (req.body.thresholds && isThresholdExceeded(req.body.value, req.body.thresholds));
      
      notificationManager.queueDataStreamNotification(
        dataStream, 
        isPriority ? 'high' : 'normal',
        config.broadcastAll
      );
    });
  } catch (error) {
    next(error);
  }
};

// Update a data stream
const updateDataStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dataStream = await dataStreamService.updateDataStream(id, req.body);

    if (!dataStream) {
      return next(new ApiError(404, `Data stream with ID ${id} not found`));
    }

    // Send response immediately
    res.status(200).json({
      status: 'success',
      data: {
        dataStream,
      },
    });

    // Queue notification asynchronously (after response sent)
    process.nextTick(() => {
      notificationManager.queueDataStreamNotification(dataStream, 'normal', config.broadcastAll);
    });
  } catch (error) {
    next(error);
  }
};

// Delete a data stream
const deleteDataStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get the dataStream before deleting it so we can use its properties in the socket event
    const dataStream = await dataStreamService.getDataStreamById(id);
    
    if (!dataStream) {
      return next(new ApiError(404, `Data stream with ID ${id} not found`));
    }
    
    // Delete the dataStream
    const result = await dataStreamService.deleteDataStream(id);

    // Send response immediately
    res.status(204).json({
      status: 'success',
      data: null,
    });

    // Handle deletion notification asynchronously
    process.nextTick(() => {
      // For deletions, send direct notifications (not buffered)
      notificationManager.sendImmediateNotification({
        id,
        telemetryDataId: dataStream.telemetryDataId,
        deleted: true
      }, config.broadcastAll);
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to check if a value exceeds thresholds
const isThresholdExceeded = (value, thresholds) => {
  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) return false;
  
  return (
    (thresholds.min !== undefined && numericValue < thresholds.min) ||
    (thresholds.max !== undefined && numericValue > thresholds.max)
  );
};

// Create multiple data streams in a batch
const createBatchDataStreams = async (req, res, next) => {
  try {
    const { dataStreams } = req.body;
    
    if (!Array.isArray(dataStreams) || dataStreams.length === 0) {
      return next(new ApiError(400, 'Invalid request: expected non-empty array of dataStreams'));
    }

    const sensorId = req.sensorId;
    if (!sensorId) {
      return next(new ApiError(400, 'Sensor ID is required'));
    }

    // Resolve telemetryDataId for each variableName in the batch
    const variableNames = Array.from(
      new Set(
        dataStreams
          .map(item => item.variableName)
          .filter(name => typeof name === 'string' && name.trim().length > 0)
      )
    );

    const telemetryEntries = await TelemetryData.findAll({
      where: {
        sensorId,
        variableName: variableNames
      }
    });

    const telemetryByName = new Map(
      telemetryEntries.map(entry => [entry.variableName, entry.id])
    );

    const now = new Date();
    const preparedStreams = dataStreams.map(item => {
      const telemetryDataId = item.telemetryDataId || telemetryByName.get(item.variableName);
      if (!telemetryDataId) {
        throw new ApiError(404, `Telemetry data not found for variableName '${item.variableName}'`);
      }

      const recievedAt = item.recievedAt ? new Date(item.recievedAt) : now;
      const validRecievedAt = isNaN(recievedAt.getTime()) ? now : recievedAt;

      return {
        value: typeof item.value === 'string' ? item.value : String(item.value),
        telemetryDataId,
        recievedAt: validRecievedAt
      };
    });

    // Process batch operation
    const createdStreams = await DataStream.bulkCreate(preparedStreams);
    
    // Send response immediately
    res.status(201).json({
      status: 'success',
      results: createdStreams.length,
      data: {
        dataStreams: createdStreams,
      },
    });

    // Process notifications and rule engine asynchronously after response
    process.nextTick(async () => {
      const sensorInstance = await Sensor.findByPk(sensorId);
      const sensorUUID = sensorInstance?.uuid;

      // Handle notifications in chunks to avoid blocking
      const processChunk = (items, index = 0, chunkSize = 20) => {
        const chunk = items.slice(index, index + chunkSize);
        
        if (chunk.length === 0) return;
        
        // Process this chunk
        chunk.forEach(dataStream => {
          // Check if this dataStream requires priority handling
          const isPriority = 
            dataStream.urgent === true || 
            (dataStream.thresholds && isThresholdExceeded(dataStream.value, dataStream.thresholds));
          
          notificationManager.queueDataStreamNotification(
            dataStream,
            isPriority ? 'high' : 'normal',
            config.broadcastAll
          );
        });
        
        // Schedule next chunk if needed
        if (index + chunkSize < items.length) {
          setTimeout(() => {
            processChunk(items, index + chunkSize, chunkSize);
          }, 10); // Small delay to avoid blocking the event loop
        }
      };
      
      // Start processing in chunks
      processChunk(createdStreams);

      if (sensorUUID) {
        createdStreams.forEach((dataStream) => {
          ruleEngineEventBus.emit('telemetry-data', {
            sensorUUID,
            dataStreamId: dataStream.id,
            telemetryDataId: dataStream.telemetryDataId,
            recievedAt: dataStream.recievedAt
          });
        });
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a data stream entry with token authentication (lightweight auth for IoT devices)
const createDataStreamWithToken = async (req, res) => {
  try {
    const { value, telemetryDataId, variableName, recievedAt } = req.body;
    
    // Validate required fields
    if (value === undefined || value === null || !variableName) {
      return res.status(400).json({
        status: 'error',
        message: 'Value and variableName are required'
      });
    }
    
    // The device auth middleware has already verified the token
    // and attached the sensor to the request
    const sensorId = req.sensorId;
    const sensorInstance = await Sensor.findOne({where: {id: sensorId}});
    console.log("the target sensor is ",sensorInstance.uuid);
    
    if (!sensorId) {
      return res.status(400).json({
        status: 'error',
        message: 'Sensor ID is required'
      });
    }
    
    // Verify that the telemetry data belongs to the authenticated sensor
    let telemetryData = null;
    if (telemetryDataId) {
      telemetryData = await TelemetryData.findOne({
        where: {
          id: telemetryDataId,
          sensorId: sensorId
        }
      });
    }

    if (!telemetryData) {
      telemetryData = await TelemetryData.findOne({
        where: { 
          variableName: variableName,
          sensorId: sensorId
        }
      });
    }
    
    if (!telemetryData) {
      return res.status(404).json({
        status: 'error',
        message: 'Telemetry data not found or does not belong to the authenticated sensor'
      });
    }
    
    // Create the data stream
    const parsedRecievedAt = recievedAt ? new Date(recievedAt) : new Date();
    const validRecievedAt = isNaN(parsedRecievedAt.getTime()) ? new Date() : parsedRecievedAt;

    const newDataStream = await DataStream.create({
      value: typeof value === 'string' ? value : String(value),
      telemetryDataId: telemetryData.id,
      recievedAt: validRecievedAt
    });
    
    res.status(201).json({
      status: 'success',
      data: newDataStream
    });
    process.nextTick(async () => {
      // Check if rule chain triggering should be skipped (for internal publisher messages)
      const skipRuleChainTrigger = req.body.skipRuleChainTrigger === true;
      
      // Determine priority based on business rules
      // For example, if there's an 'urgent' flag or value exceeds thresholds
      const isPriority = req.body.urgent === true || 
                        (req.body.thresholds && isThresholdExceeded(req.body.value, req.body.thresholds));
      
      // Send Socket.IO notification
      notificationManager.queueDataStreamNotification(
        newDataStream, 
        isPriority ? 'high' : 'normal',
        config.broadcastAll
      );

      // 🎯 Publish to protocols based on origin protocol
      try {
        const deviceUuid = req.device?.uuid || req.deviceUuid;
        const originProtocol = req.originProtocol || 'http'; // Default to http for HTTP routes
        
        if (deviceUuid) {
          const dataStreamNotification = {
            event: 'state_change',
            deviceUuid,
            state: newDataStream,
            timestamp: new Date().toISOString()
          };
          
          // Conditionally publish based on origin protocol
          if (originProtocol === 'mqtt') {
            // For MQTT-originated requests, publish to MQTT only
            await mqttPublisher.publishDataStream(newDataStream, deviceUuid);
            logger.debug(`Data stream published to MQTT for device ${deviceUuid} (MQTT origin)`);
          } else if (originProtocol === 'coap') {
            // For CoAP-originated requests, notify CoAP observers only
            await coapPublisher.notifyObservers(deviceUuid, dataStreamNotification);
            logger.debug(`Data stream notified to CoAP observers for device ${deviceUuid} (CoAP origin)`);
          } else {
            // For HTTP or unknown protocols, publish to both MQTT and CoAP
            // This allows HTTP-triggered data streams to notify all subscribers
            await mqttPublisher.publishDataStream(newDataStream, deviceUuid);
            await coapPublisher.notifyObservers(deviceUuid, dataStreamNotification);
            logger.debug(`Data stream published to MQTT and CoAP for device ${deviceUuid} (${originProtocol} origin)`);
          }
        }
      } catch (error) {
        logger.error(`Failed to publish data stream: ${error.message}`);
      }

      // Trigger rule engine only if not skipped
      if (!skipRuleChainTrigger) {
        const emitResult = await ruleEngineEventBus.emit('telemetry-data', {
          sensorUUID: sensorInstance.uuid,
          dataStreamId: newDataStream.id,
          telemetryDataId: newDataStream.telemetryDataId,
          recievedAt: newDataStream.recievedAt
        });

        if (emitResult && emitResult.rejected) {
          logger.warn('Rule engine event rejected due to backpressure', {
            sensorUUID: sensorInstance.uuid,
            dataStreamId: newDataStream.id,
            reason: emitResult.reason,
            queueDepth: emitResult.queueDepth
          });
        }
      } else {
        logger.info('Skipping rule chain trigger for internal publisher data stream');
      }
    });
    
  } catch (error) {
    logger.error(`Error creating data stream with token: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      body: req.body,
      sensorId: req.sensorId,
      deviceUuid: req.deviceUuid
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create data stream'
    });
  }
};

module.exports = {
  getAllDataStreams,
  getDataStreamById,
  getDataStreamsByTelemetryId,
  createDataStream,
  updateDataStream,
  deleteDataStream,
  createBatchDataStreams,
  createDataStreamWithToken
}; 