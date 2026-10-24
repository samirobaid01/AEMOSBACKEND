const logger = require('../../utils/logger');

const VALID_BACKENDS = ['mysql', 'timescale', 'influx'];

const BACKEND = process.env.TIMESERIES_BACKEND || 'mysql';

if (!VALID_BACKENDS.includes(BACKEND)) {
  throw new Error(
    `Unknown TIMESERIES_BACKEND: "${BACKEND}". Valid values: ${VALID_BACKENDS.join(' | ')}`
  );
}

const adapters = {
  mysql:     () => require('./adapters/MySQLTimeSeriesAdapter'),
  timescale: () => require('./adapters/TimescaleDBAdapter'),
  influx:    () => require('./adapters/InfluxDBAdapter'),
};

const instance = new (adapters[BACKEND]())();

logger.info(`TimeSeriesRepository: using "${BACKEND}" adapter`);

module.exports = instance;
