const { DataStream, TelemetryData } = require('../models/initModels');
const tsRepo = require('../repositories/timeseries/TimeSeriesRepositoryFactory');

// Relational queries — stay on MySQL/Sequelize (need JOIN with TelemetryData)
const getAllDataStreams = async () => {
  return DataStream.findAll({
    include: [{ model: TelemetryData, as: 'TelemetryData' }],
  });
};

const getDataStreamById = async (id) => {
  return DataStream.findByPk(id, {
    include: [{ model: TelemetryData, as: 'TelemetryData' }],
  });
};

// Time-series queries — routed through pluggable adapter
const getDataStreamsByTelemetryId = async (telemetryDataId) => {
  return tsRepo.queryLatest(telemetryDataId);
};

const getDataStreamRangeByTelemetryId = async (telemetryDataId, from, to, opts = {}) => {
  return tsRepo.queryRange(telemetryDataId, from, to, opts);
};

const createDataStream = async (dataStreamData) => {
  return tsRepo.insert([dataStreamData]);
};

const createBatchDataStreams = async (dataStreams) => {
  if (!Array.isArray(dataStreams) || dataStreams.length === 0) {
    throw new Error('Invalid batch data: expected non-empty array');
  }
  return tsRepo.insert(dataStreams);
};

// Update / delete stay on MySQL (by primary key, relational semantics)
const updateDataStream = async (id, dataStreamData) => {
  const dataStream = await DataStream.findByPk(id);
  if (!dataStream) return false;
  await dataStream.update(dataStreamData);
  return dataStream;
};

const deleteDataStream = async (id) => {
  const dataStream = await DataStream.findByPk(id);
  if (!dataStream) return false;
  await dataStream.destroy();
  return true;
};

module.exports = {
  getAllDataStreams,
  getDataStreamById,
  getDataStreamsByTelemetryId,
  getDataStreamRangeByTelemetryId,
  createDataStream,
  updateDataStream,
  deleteDataStream,
  createBatchDataStreams,
}; 