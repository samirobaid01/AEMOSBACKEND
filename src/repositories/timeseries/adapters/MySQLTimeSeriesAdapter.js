const { Op } = require('sequelize');
const TimeSeriesRepository = require('../TimeSeriesRepository');

class MySQLTimeSeriesAdapter extends TimeSeriesRepository {
  _getModel() {
    // Lazy-require to avoid circular dependencies at module load time
    const { DataStream } = require('../../../models/initModels');
    return DataStream;
  }

  async insert(rows) {
    const DataStream = this._getModel();
    const now = new Date();
    const prepared = rows.map(r => ({ ...r, recievedAt: r.recievedAt || now }));
    return DataStream.bulkCreate(prepared);
  }

  async queryLatest(telemetryDataId) {
    const DataStream = this._getModel();
    return DataStream.findOne({
      where: { telemetryDataId },
      order: [['recievedAt', 'DESC']],
    });
  }

  async queryRange(telemetryDataId, from, to, { limit = 1000, bucket } = {}) {
    const DataStream = this._getModel();
    // bucket-based aggregation not available in plain MySQL; return raw rows
    return DataStream.findAll({
      where: { telemetryDataId, recievedAt: { [Op.between]: [from, to] } },
      order: [['recievedAt', 'ASC']],
      limit,
    });
  }

  async deleteOlderThan(days) {
    const DataStream = this._getModel();
    const cutoff = new Date(Date.now() - days * 86400_000);
    return DataStream.destroy({ where: { recievedAt: { [Op.lt]: cutoff } } });
  }

  async healthCheck() {
    const DataStream = this._getModel();
    await DataStream.findOne({ limit: 1 });
    return { ok: true, backend: 'mysql' };
  }
}

module.exports = MySQLTimeSeriesAdapter;
