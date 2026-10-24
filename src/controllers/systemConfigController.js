const { SystemConfig } = require('../models/initModels');
const { ApiError } = require('../middlewares/errorHandler');

const ALLOWED_KEYS = [
  'TIMESERIES_BACKEND',
  'MQTT_BROKER_MODE',
  'MESSAGE_QUEUE_TYPE',
  'WORKER_MIN_CONCURRENCY',
  'WORKER_MAX_CONCURRENCY',
  'REDIS_SENTINEL_HOSTS',
  'SOCKET_REDIS_ADAPTER',
];

const getAllConfigs = async (req, res, next) => {
  try {
    const configs = await SystemConfig.findAll({ order: [['key', 'ASC']] });
    res.json({ status: 'success', data: configs });
  } catch (err) {
    next(err);
  }
};

const getConfig = async (req, res, next) => {
  try {
    const config = await SystemConfig.findOne({ where: { key: req.params.key } });
    if (!config) throw new ApiError(404, `Config key "${req.params.key}" not found`);
    res.json({ status: 'success', data: config });
  } catch (err) {
    next(err);
  }
};

const upsertConfig = async (req, res, next) => {
  try {
    const { key, value, description } = req.body;
    if (!key) throw new ApiError(400, 'key is required');
    if (!ALLOWED_KEYS.includes(key)) {
      throw new ApiError(400, `Key "${key}" is not in the allowed list: ${ALLOWED_KEYS.join(', ')}`);
    }
    const [record, created] = await SystemConfig.upsert(
      { key, value, description, updatedBy: req.user.id },
      { returning: true }
    );
    res.status(created ? 201 : 200).json({ status: 'success', data: record });
  } catch (err) {
    next(err);
  }
};

const deleteConfig = async (req, res, next) => {
  try {
    const deleted = await SystemConfig.destroy({ where: { key: req.params.key } });
    if (!deleted) throw new ApiError(404, `Config key "${req.params.key}" not found`);
    res.json({ status: 'success', message: 'Config deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllConfigs, getConfig, upsertConfig, deleteConfig };
