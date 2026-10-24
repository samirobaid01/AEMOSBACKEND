class TimeSeriesRepository {
  async insert(rows) { throw new Error('Not implemented'); }
  async queryLatest(telemetryDataId) { throw new Error('Not implemented'); }
  async queryRange(telemetryDataId, from, to, opts = {}) { throw new Error('Not implemented'); }
  async deleteOlderThan(days) { throw new Error('Not implemented'); }
  async healthCheck() { throw new Error('Not implemented'); }
}

module.exports = TimeSeriesRepository;
