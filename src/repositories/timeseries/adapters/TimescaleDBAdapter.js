const { Pool } = require('pg');
const TimeSeriesRepository = require('../TimeSeriesRepository');

const pool = new Pool({
  host:     process.env.TSDB_HOST     || 'localhost',
  port:     parseInt(process.env.TSDB_PORT || '5432', 10),
  database: process.env.TSDB_NAME     || 'aemos_timeseries',
  user:     process.env.TSDB_USER,
  password: process.env.TSDB_PASSWORD,
  max:      parseInt(process.env.TSDB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 60000,
});

class TimescaleDBAdapter extends TimeSeriesRepository {
  async insert(rows) {
    if (!rows.length) return;
    const now = new Date();
    const prepared = rows.map(r => ({ ...r, recievedAt: r.recievedAt || now }));
    // Single parameterised bulk INSERT — one round-trip regardless of batch size
    const vals = prepared.map((_, i) =>
      `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`
    ).join(',');
    const params = prepared.flatMap(r => [r.telemetryDataId, r.value, r.recievedAt]);
    await pool.query(
      `INSERT INTO datastream (telemetry_data_id, value, received_at) VALUES ${vals}`,
      params
    );
  }

  async queryLatest(telemetryDataId) {
    const { rows } = await pool.query(
      `SELECT id, telemetry_data_id AS "telemetryDataId", value, received_at AS "recievedAt"
       FROM datastream WHERE telemetry_data_id = $1
       ORDER BY received_at DESC LIMIT 1`,
      [telemetryDataId]
    );
    return rows[0] || null;
  }

  async queryRange(telemetryDataId, from, to, { granularity = '1 minute', limit = 1000 } = {}) {
    const { rows } = await pool.query(
      `SELECT time_bucket($1::interval, received_at) AS bucket,
              AVG(value::numeric)                    AS value,
              COUNT(*)                               AS count
       FROM datastream
       WHERE telemetry_data_id = $2 AND received_at BETWEEN $3 AND $4
       GROUP BY bucket ORDER BY bucket ASC LIMIT $5`,
      [granularity, telemetryDataId, from, to, limit]
    );
    return rows;
  }

  async deleteOlderThan(days) {
    await pool.query(
      `DELETE FROM datastream WHERE received_at < NOW() - ($1 || ' days')::INTERVAL`,
      [days]
    );
  }

  async healthCheck() {
    await pool.query('SELECT 1');
    return { ok: true, backend: 'timescale' };
  }
}

module.exports = TimescaleDBAdapter;
