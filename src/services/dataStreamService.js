const { DataStream, TelemetryData } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');

// DATA STREAM OPERATIONS

// Get all data streams
const getAllDataStreams = async () => {
  return await DataStream.findAll({
    include: [
      {
        model: TelemetryData,
        as: 'TelemetryData'
      }
    ]
  });
};

// Get a single data stream by ID
const getDataStreamById = async (id) => {
  return await DataStream.findByPk(id, {
    include: [
      {
        model: TelemetryData,
        as: 'TelemetryData'
      }
    ]
  });
};

// Get data streams for a telemetry data item
const getDataStreamsByTelemetryId = async (telemetryDataId) => {
  return await DataStream.findAll({
    where: {
      telemetryDataId
    }
  });
};

// Create a new data stream
const createDataStream = async (dataStreamData) => {
  // Set received timestamp if not provided
  if (!dataStreamData.recievedAt) {
    dataStreamData.recievedAt = new Date();
  }
  
  return await DataStream.create(dataStreamData);
};

// Update a data stream
const updateDataStream = async (id, dataStreamData) => {
  const dataStream = await DataStream.findByPk(id);
  
  if (!dataStream) {
    return false;
  }
  
  await dataStream.update(dataStreamData);
  return dataStream;
};

// Delete a data stream
const deleteDataStream = async (id) => {
  const dataStream = await DataStream.findByPk(id);
  
  if (!dataStream) {
    return false;
  }
  
  await dataStream.destroy();
  return true;
};

// Create multiple data streams in one batch operation
const createBatchDataStreams = async (dataStreams) => {
  if (!Array.isArray(dataStreams) || dataStreams.length === 0) {
    throw new Error('Invalid batch data: expected non-empty array');
  }
  
  // Set received timestamp for any items missing it
  const now = new Date();
  const preparedData = dataStreams.map(item => ({
    ...item,
    recievedAt: item.recievedAt || now
  }));
  
  // Use bulkCreate for efficient database operation
  return await DataStream.bulkCreate(preparedData);
};

module.exports = {
  getAllDataStreams,
  getDataStreamById,
  getDataStreamsByTelemetryId,
  createDataStream,
  updateDataStream,
  deleteDataStream,
  createBatchDataStreams
}; 