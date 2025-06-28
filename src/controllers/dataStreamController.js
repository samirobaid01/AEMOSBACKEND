const dataStreamService = require('../services/dataStreamService');
const { ApiError } = require('../middlewares/errorHandler');
const notificationManager = require('../utils/notificationManager');
const config = require('../config');
const TelemetryData = require('../models/TelemetryData');
const DataStream = require('../models/DataStream');
const logger = require('../utils/logger');
const socketManager = require('../utils/socketManager');

// Import rule engine with error handling
let ruleEngine = null;
let EventTypes = null;
let EventSources = null;
try {
  const ruleEngineModule = require('../ruleEngine');
  ruleEngine = ruleEngineModule.ruleEngine;
  EventTypes = ruleEngineModule.EventTypes;
  EventSources = ruleEngineModule.EventSources;
} catch (error) {
  logger.warn('Rule engine import failed in dataStreamController, telemetry events will be skipped:', error.message);
}

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
    process.nextTick(async () => {
      try {
        // Determine priority based on business rules
        const isPriority = req.body.urgent === true || 
                          (req.body.thresholds && isThresholdExceeded(req.body.value, req.body.thresholds));
        
        notificationManager.queueDataStreamNotification(
          dataStream, 
          isPriority ? 'high' : 'normal',
          config.broadcastAll
        );

        // Get telemetry data details for the event
        const telemetryData = await TelemetryData.findByPk(dataStream.telemetryDataId, {
          include: [{
            model: require('../models/Sensor'),
            as: 'Sensor'
          }]
        });

        if (telemetryData && telemetryData.Sensor) {
          logger.info('🔍 DEBUG: About to emit telemetry event', {
            sensorUuid: telemetryData.Sensor.uuid,
            telemetryDataId: dataStream.telemetryDataId,
            variableName: telemetryData.variableName,
            value: dataStream.value,
            datatype: telemetryData.datatype,
            organizationId: req.user?.organizationId || 1,
            ruleEngineAvailable: true,
            sensorUuidDefined: !!telemetryData.Sensor.uuid,
            sensorObject: {
              id: telemetryData.Sensor.id,
              UUID: telemetryData.Sensor.uuid,
              name: telemetryData.Sensor.name
            }
          });

          // Validate sensor UUID before emitting event
          if (!telemetryData.Sensor.uuid) {
            logger.error('❌ DEBUG: Sensor UUID is undefined/null', {
              sensorId: telemetryData.Sensor.id,
              sensorName: telemetryData.Sensor.name,
              telemetryDataId: dataStream.telemetryDataId,
              fullSensorObject: telemetryData.Sensor
            });
            return; // Don't emit event if UUID is missing
          }

          if (ruleEngine && EventTypes && EventSources) {
            ruleEngine.emitTelemetryEvent({
              sensorUuid: telemetryData.Sensor.uuid,
              telemetryDataId: dataStream.telemetryDataId,
              variableName: telemetryData.variableName,
              value: dataStream.value,
              datatype: telemetryData.datatype,
              timestamp: dataStream.recievedAt,
              organizationId: req.user?.organizationId || 1, // Use from auth context
              metadata: {
                source: EventSources.HTTP_API,
                priority: isPriority ? 'high' : 'normal',
                urgent: req.body.urgent || false
              }
            });
          } else {
            logger.debug('Rule engine not available, skipping telemetry event emission');
          }
        } else {
          logger.error('❌ DEBUG: Missing telemetry data or sensor', {
            hasTelemetryData: !!telemetryData,
            hasSensor: telemetryData ? !!telemetryData.Sensor : false,
            telemetryDataId: dataStream.telemetryDataId
          });
        }
      } catch (error) {
        logger.error('Error in async processing after dataStream creation:', error);
      }
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
    process.nextTick(async () => {
      try {
        notificationManager.queueDataStreamNotification(dataStream, 'normal', config.broadcastAll);

        // Get telemetry data details for the event
        const telemetryData = await TelemetryData.findByPk(dataStream.telemetryDataId, {
          include: [{
            model: require('../models/Sensor'),
            as: 'Sensor'
          }]
        });

        if (telemetryData && telemetryData.Sensor) {
          if (ruleEngine && EventTypes && EventSources) {
            ruleEngine.emitTelemetryEvent({
              sensorUuid: telemetryData.Sensor.uuid,
              telemetryDataId: dataStream.telemetryDataId,
              variableName: telemetryData.variableName,
              value: dataStream.value,
              datatype: telemetryData.datatype,
              timestamp: dataStream.recievedAt,
              organizationId: req.user?.organizationId || 1,
              metadata: {
                source: EventSources.HTTP_API,
                priority: 'normal',
                urgent: false
              }
            });
          } else {
            logger.debug('Rule engine not available, skipping telemetry event emission');
          }
        }
      } catch (error) {
        logger.error('Error in async processing after dataStream update:', error);
      }
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

    // Process batch operation
    const createdStreams = await dataStreamService.createBatchDataStreams(dataStreams);
    
    // Send response immediately
    res.status(201).json({
      status: 'success',
      results: createdStreams.length,
      data: {
        dataStreams: createdStreams,
      },
    });

    // Process notifications and rule engine events asynchronously after response
    process.nextTick(async () => {
      try {
        // Prepare batch telemetry data for rule engine
        const telemetryDataItems = [];

        // Handle notifications in chunks to avoid blocking
        const processChunk = async (items, index = 0, chunkSize = 20) => {
          const chunk = items.slice(index, index + chunkSize);
          
          if (chunk.length === 0) return;
          
          // Process this chunk
          for (const dataStream of chunk) {
            try {
              // Check if this dataStream requires priority handling
              const isPriority = 
                dataStream.urgent === true || 
                (dataStream.thresholds && isThresholdExceeded(dataStream.value, dataStream.thresholds));
              
              notificationManager.queueDataStreamNotification(
                dataStream,
                isPriority ? 'high' : 'normal',
                config.broadcastAll
              );

              // Collect telemetry data for batch event
              const telemetryData = await TelemetryData.findByPk(dataStream.telemetryDataId, {
                include: [{
                  model: require('../models/Sensor'),
                  as: 'Sensor'
                }]
              });

              if (telemetryData && telemetryData.Sensor) {
                telemetryDataItems.push({
                  sensorUuid: telemetryData.Sensor.uuid,
                  telemetryDataId: dataStream.telemetryDataId,
                  variableName: telemetryData.variableName,
                  value: dataStream.value,
                  datatype: telemetryData.datatype,
                  timestamp: dataStream.recievedAt
                });
              }
            } catch (error) {
              logger.error('Error processing dataStream in batch:', error);
            }
          }
          
          // Schedule next chunk if needed
          if (index + chunkSize < items.length) {
            setTimeout(() => {
              processChunk(items, index + chunkSize, chunkSize);
            }, 10); // Small delay to avoid blocking the event loop
          } else {
            // Emit batch telemetry event after processing all chunks
            if (telemetryDataItems.length > 0) {
              if (ruleEngine && EventTypes && EventSources) {
                ruleEngine.emitBatchTelemetryEvent({
                  telemetryData: telemetryDataItems,
                  organizationId: req.user?.organizationId || 1,
                  timestamp: new Date(),
                  metadata: {
                    source: EventSources.BATCH_PROCESS,
                    priority: 'normal',
                    batchSize: telemetryDataItems.length
                  }
                });
              }
            }
          }
        };
        
        // Start processing in chunks
        await processChunk(createdStreams);
      } catch (error) {
        logger.error('Error in async batch processing:', error);
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a data stream entry with token authentication (lightweight auth for IoT devices)
const createDataStreamWithToken = async (req, res) => {
  try {
    const { value, telemetryDataId } = req.body;
    
    // The device auth middleware has already verified the token
    // and attached the sensor to the request
    const sensorId = req.sensorId;
    
    // Verify that the telemetry data belongs to the authenticated sensor
    const telemetryData = await TelemetryData.findOne({
      where: { 
        id: telemetryDataId,
        sensorId: sensorId
      },
      include: [{
        model: require('../models/Sensor'),
        as: 'Sensor'
      }]
    });
    
    if (!telemetryData) {
      return res.status(404).json({
        status: 'error',
        message: 'Telemetry data not found or does not belong to the authenticated sensor'
      });
    }
    
    // Create the data stream
    const newDataStream = await DataStream.create({
      value,
      telemetryDataId,
      recievedAt: new Date()
    });
    
    res.status(201).json({
      status: 'success',
      data: newDataStream
    });
    // code to be removed

    // process.nextTick(() => {
    //   // Determine priority based on business rules
    //   // For example, if there's an 'urgent' flag or value exceeds thresholds
    //   const isPriority = req.body.urgent === true || 
    //                     (req.body.thresholds && isThresholdExceeded(req.body.value, req.body.thresholds));
      
    //   notificationManager.queueDataStreamNotification(
    //     newDataStream, 
    //     isPriority ? 'high' : 'normal',
    //     config.broadcastAll
    //   );
    //   ruleChainService.trigger();
    // above code to be removed

    process.nextTick(async () => {
      try {
        // Determine priority based on business rules
        const isPriority = req.body.urgent === true || 
                          (req.body.thresholds && isThresholdExceeded(req.body.value, req.body.thresholds));
        
        notificationManager.queueDataStreamNotification(
          newDataStream, 
          isPriority ? 'high' : 'normal',
          config.broadcastAll
        );

        // Get telemetry data details for the event
        if (telemetryData.Sensor) {
          logger.info('🔍 DEBUG: About to emit telemetry event (TOKEN AUTH)', {
            sensorUuid: telemetryData.Sensor.uuid,
            telemetryDataId: newDataStream.telemetryDataId,
            variableName: telemetryData.variableName,
            value: newDataStream.value,
            datatype: telemetryData.datatype,
            organizationId: telemetryData.Sensor.organizationId || 1,
            ruleEngineAvailable: true,
            sensorUuidDefined: !!telemetryData.Sensor.uuid,
            sensorObject: {
              id: telemetryData.Sensor.id,
              UUID: telemetryData.Sensor.uuid,
              name: telemetryData.Sensor.name
            }
          });

          // Validate sensor UUID before emitting event
          if (!telemetryData.Sensor.uuid) {
            logger.error('❌ DEBUG: Sensor UUID is undefined/null (TOKEN AUTH)', {
              sensorId: telemetryData.Sensor.id,
              sensorName: telemetryData.Sensor.name,
              telemetryDataId: newDataStream.telemetryDataId,
              fullSensorObject: telemetryData.Sensor
            });
            return; // Don't emit event if UUID is missing
          }

          if (ruleEngine && EventTypes && EventSources) {
            ruleEngine.emitTelemetryEvent({
              sensorUuid: telemetryData.Sensor.uuid,
              telemetryDataId: newDataStream.telemetryDataId,
              variableName: telemetryData.variableName,
              value: newDataStream.value,
              datatype: telemetryData.datatype,
              timestamp: newDataStream.recievedAt,
              organizationId: telemetryData.Sensor.organizationId || 1, // Get from sensor
              metadata: {
                source: EventSources.TOKEN_AUTH,
                priority: isPriority ? 'high' : 'normal',
                urgent: req.body.urgent || false
              }
            });
          } else {
            logger.debug('Rule engine not available, skipping telemetry event emission (TOKEN AUTH)');
          }
        } else {
          logger.error('❌ DEBUG: Missing sensor data in telemetry (TOKEN AUTH)', {
            hasTelemetryData: !!telemetryData,
            hasSensor: !!telemetryData.Sensor,
            telemetryDataId: newDataStream.telemetryDataId
          });
        }
      } catch (error) {
        logger.error('Error in async processing after token dataStream creation:', error);
      }
    });
    
  } catch (error) {
    logger.error(`Error creating data stream with token: ${error.message}`);
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