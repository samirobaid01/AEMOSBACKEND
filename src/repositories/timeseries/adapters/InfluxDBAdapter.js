const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const TimeSeriesRepository = require('../TimeSeriesRepository');

const client = new InfluxDB({
  url:   process.env.INFLUX_URL   || 'http://localhost:8086',
  token: process.env.INFLUX_TOKEN || '',
});

const ORG    = process.env.INFLUX_ORG    || 'aemos';
const BUCKET = process.env.INFLUX_BUCKET || 'datastream';

class InfluxDBAdapter extends TimeSeriesRepository {
  _writeApi() {
    return client.getWriteApi(ORG, BUCKET, 'ms');
  }

  _queryApi() {
    return client.getQueryApi(ORG);
  }

  async insert(rows) {
    const api = this._writeApi();
    const now = Date.now();
    for (const r of rows) {
      const ts = r.recievedAt ? new Date(r.recievedAt).getTime() : now;
      const point = new Point('datastream')
        .tag('telemetryDataId', String(r.telemetryDataId))
        .floatField('value', parseFloat(r.value))
        .timestamp(ts);
      api.writePoint(point);
    }
    await api.close();
  }

  async queryLatest(telemetryDataId) {
    const flux = `
      from(bucket: "${BUCKET}")
        |> range(start: -30d)
        |> filter(fn: (r) => r._measurement == "datastream" and r.telemetryDataId == "${telemetryDataId}")
        |> last()
    `;
    const rows = await this._collectRows(flux);
    if (!rows.length) return null;
    const r = rows[0];
    return { telemetryDataId, value: String(r._value), recievedAt: new Date(r._time) };
  }

  async queryRange(telemetryDataId, from, to, { granularity = '1m', limit = 1000 } = {}) {
    const flux = `
      from(bucket: "${BUCKET}")
        |> range(start: ${new Date(from).toISOString()}, stop: ${new Date(to).toISOString()})
        |> filter(fn: (r) => r._measurement == "datastream" and r.telemetryDataId == "${telemetryDataId}")
        |> aggregateWindow(every: ${granularity}, fn: mean, createEmpty: false)
        |> limit(n: ${limit})
    `;
    const rows = await this._collectRows(flux);
    return rows.map(r => ({ value: String(r._value), recievedAt: new Date(r._time) }));
  }

  async deleteOlderThan(days) {
    const { DeleteAPI } = require('@influxdata/influxdb-client-apis');
    const deleteApi = new DeleteAPI(client);
    const stop  = new Date().toISOString();
    const start = new Date(Date.now() - days * 86400_000).toISOString();
    await deleteApi.postDelete({
      org: ORG, bucket: BUCKET,
      body: { start, stop, predicate: '_measurement="datastream"' },
    });
  }

  async healthCheck() {
    const { HealthAPI } = require('@influxdata/influxdb-client-apis');
    const healthApi = new HealthAPI(client);
    await healthApi.getHealth();
    return { ok: true, backend: 'influx' };
  }

  _collectRows(flux) {
    return new Promise((resolve, reject) => {
      const rows = [];
      this._queryApi().queryRows(flux, {
        next:     (row, meta) => rows.push(meta.toObject(row)),
        error:    reject,
        complete: () => resolve(rows),
      });
    });
  }
}

module.exports = InfluxDBAdapter;
