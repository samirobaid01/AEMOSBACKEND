const dataStreamService = require('../services/dataStreamService');
const { ApiError } = require('../middlewares/errorHandler');
const notificationManager = require('../utils/notificationManager');
const config = require('../config');
const TelemetryData = require('../models/TelemetryData');
const DataStream = require('../models/DataStream');
const logger = require('../utils/logger');
const socketManager = require('../utils/socketManager');
const {ruleChainService} = require('../services/ruleChainService');

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

    // Process notifications asynchronously after response
    process.nextTick(() => {
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
      }
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
    process.nextTick(() => {
      // Determine priority based on business rules
      // For example, if there's an 'urgent' flag or value exceeds thresholds
      const isPriority = req.body.urgent === true || 
                        (req.body.thresholds && isThresholdExceeded(req.body.value, req.body.thresholds));
      
      notificationManager.queueDataStreamNotification(
        newDataStream, 
        isPriority ? 'high' : 'normal',
        config.broadcastAll
      );
      ruleChainService.trigger();
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