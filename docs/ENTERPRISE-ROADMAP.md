# AEMOS Enterprise Roadmap

## 🎯 Context: What Has Been Accomplished

| Sprint | Scope | Status |
|--------|-------|--------|
| **P0** | Stability, backpressure, circuit breaker, health checks, Redis password enforcement | ✅ Complete |
| **P1** | Variable-level index (10× speedup), rule timeouts + error codes, Prometheus metrics (cardinality-safe), UUID validation | ✅ Complete |
| **P2** | Redis connection reuse (33% fewer connections) | ✅ Complete |
| **Real-time Dashboard** | Architecture designed, Phase 1 (feature flag) in progress | 🔄 In Progress |

**Current capability**: ~1,000 events/sec on a single Node.js process with MySQL + embedded MQTT + Redis.

**Target**: Millions of events/sec, horizontally scalable, enterprise-grade security, aquaponics-specific intelligence.

---

## 📦 Sprint Overview

| Sprint | Theme | Effort | Impact | Priority |
|--------|-------|--------|--------|----------|
| **P3** | Security hardening | 3 days | Eliminate critical security gaps | 🔴 Critical |
| **P4** | Pluggable data layer (MySQL / TimescaleDB / InfluxDB) | 2 weeks | Client-selectable storage; 10–100× throughput | 🟠 High |
| **P5** | Protocol & messaging scale + elastic compute | 3 weeks | 100K events/sec; scale-to-zero workers at low load | 🟠 High |
| **P6** | Platform services | 6 weeks | Full IoT device lifecycle | 🟡 Medium |
| **P7** | Analytics & intelligence | 6 weeks | Aquaponics-specific ML + reporting | 🟡 Medium |
| **P8** | Enterprise (elastic profiles, KEDA, scale-to-zero) | Ongoing | 10M+ events/sec; pay-for-what-you-use at every tier | 🟢 Planned |

---

# 🔴 P3: Security Hardening

## Executive Summary

**Sprint Goal**: Close the five critical security gaps before any scale-out deployment.  
**Total Effort**: 3 days  
**Priority**: 🔴 Critical — must complete before P4  
**Dependencies**: P0, P1, P2 complete ✅

---

## P3 Issues Overview

| # | Issue | Effort | Impact | Status |
|---|-------|--------|--------|--------|
| 3.1 | Redis-backed JWT blacklist | 0.5 days | Security — tokens survive restart | ☐ |
| 3.2 | CORS allowlist | 0.25 days | Security — closes CSRF vector | ☐ |
| 3.3 | Remove / guard debug routes | 0.25 days | Security — no internal state leakage | ☐ |
| 3.4 | Increase MySQL connection pool | 0.5 days | Stability — pool exhaustion under load | ☐ |
| 3.5 | Complete real-time dashboard P1–P7 | 1.5 days | Feature — ship the in-progress work | ☐ |

---

## 🎫 Issue 3.1: Redis-Backed JWT Blacklist

### Problem Statement

`tokenBlacklistService.js` uses an in-memory `Set` to store invalidated JWT tokens:

```javascript
// ❌ In-memory only — lost on restart, not shared across instances
const blacklistedTokens = new Set();
```

**Impact**:
- A user who logs out has their token re-validated after server restart.
- Multiple API instances share no blacklist state — a token revoked on instance A is valid on instance B.
- Memory leak risk if `setTimeout` cleanup fails under high logout volume.

### Acceptance Criteria

- [ ] **AC1**: Blacklisted tokens stored in Redis with TTL equal to the token's remaining expiry time.
- [ ] **AC2**: `isBlacklisted(token)` performs a Redis GET; returns `true` if key exists.
- [ ] **AC3**: `blacklist(token, expiresIn)` performs a Redis SET with EX = remaining seconds.
- [ ] **AC4**: Works with the existing shared `redisConnection` (no new connection).
- [ ] **AC5**: Falls back gracefully if Redis is unavailable (log error, do not crash auth).
- [ ] **AC6**: Unit tests cover blacklist, lookup, TTL calculation, and Redis failure fallback.

### Technical Approach

```javascript
// src/services/tokenBlacklistService.js

const redis = require('../config/redis');
const logger = require('../utils/logger');

const BLACKLIST_PREFIX = 'jwt:blacklist:';

async function blacklist(token, expiresAt) {
  const ttl = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  const key = `${BLACKLIST_PREFIX}${token}`;
  try {
    await redis.set(key, '1', 'EX', ttl);
  } catch (err) {
    logger.error('Failed to blacklist token in Redis', { error: err.message });
    // Fail open — do not crash the logout flow
  }
}

async function isBlacklisted(token) {
  const key = `${BLACKLIST_PREFIX}${token}`;
  try {
    const val = await redis.get(key);
    return val !== null;
  } catch (err) {
    logger.error('Failed to check token blacklist in Redis', { error: err.message });
    return false; // Fail open — do not block all requests if Redis is down
  }
}

module.exports = { blacklist, isBlacklisted };
```

`authService.logout(token)` must pass the token's `exp` claim (in ms) as `expiresAt`:
```javascript
const { exp } = jwt.decode(token);           // exp is seconds since epoch
await tokenBlacklistService.blacklist(token, exp * 1000);
```

### Files to Modify

- `src/services/tokenBlacklistService.js` — rewrite with Redis
- `src/services/authService.js` — pass `exp` on logout
- `tests/unit/tokenBlacklistService.test.js` — new tests

### Environment Variables

No new variables. Uses existing `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.

---

## 🎫 Issue 3.2: CORS Allowlist

### Problem Statement

`app.js` currently passes `origin: '*'` to the `cors` middleware:

```javascript
// ❌ All origins allowed — CSRF risk for browser clients
app.use(cors());
```

### Acceptance Criteria

- [ ] **AC1**: CORS origin restricted to a configurable allowlist via `CORS_ORIGIN` env var.
- [ ] **AC2**: `CORS_ORIGIN` accepts a comma-separated list (e.g. `https://app.aemos.io,https://admin.aemos.io`).
- [ ] **AC3**: In production, if `CORS_ORIGIN` is unset or `*`, server logs a warning and refuses to start.
- [ ] **AC4**: Existing `CORS_ORIGIN` env var in `config/features.js` (Socket.io) is reused for consistency.

### Technical Approach

```javascript
// src/config/index.js — add:
cors: {
  origin: process.env.CORS_ORIGIN || '*',
}

// src/app.js — replace:
const allowedOrigins = config.cors.origin === '*'
  ? '*'
  : config.cors.origin.split(',').map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
```

Production guard in `src/config/index.js` (alongside existing Redis/JWT validation):
```javascript
if (config.server.nodeEnv === 'production' && config.cors.origin === '*') {
  throw new Error('CORS_ORIGIN must be set to an explicit allowlist in production');
}
```

### Files to Modify

- `src/config/index.js` — add cors config + production validation
- `src/app.js` — use cors allowlist

---

## 🎫 Issue 3.3: Remove Debug Routes from Production

### Problem Statement

Three test/debug routes are mounted unconditionally in production:
- `/test` and `/direct-test` (device-token controller)
- `/api/v1/app-device-token-test`

These expose internal state (token verification, DB lookups) with no authentication.

### Acceptance Criteria

- [ ] **AC1**: All debug route mounts wrapped in `if (process.env.NODE_ENV !== 'production')`.
- [ ] **AC2**: A test in `tests/security/` asserts that debug routes return 404 when `NODE_ENV=production`.
- [ ] **AC3**: `PRODUCTION-DEPLOYMENT.md` updated to document this requirement.

### Technical Approach

Locate every `router.get('/test', ...)` and `router.get('/direct-test', ...)` and the `/app-device-token-test` route mount; wrap each in:

```javascript
if (process.env.NODE_ENV !== 'production') {
  router.get('/test', testHandler);
}
```

---

## 🎫 Issue 3.4: Increase MySQL Connection Pool

### Problem Statement

`src/config/database.js` sets `pool.max = 5`. Under concurrent API load (simultaneous rule engine queries, HTTP requests, and telemetry writes), the pool exhausts and requests queue or time out.

### Acceptance Criteria

- [ ] **AC1**: Pool max configurable via `DB_POOL_MAX` env var (default: 20 for development, 30 for production).
- [ ] **AC2**: Pool `acquire` timeout increased to `60000` ms (was `30000`).
- [ ] **AC3**: Pool `idle` timeout set to `10000` ms.
- [ ] **AC4**: `PRODUCTION-DEPLOYMENT.md` updated with pool sizing guidance.

### Technical Approach

```javascript
// src/config/database.js
pool: {
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  min: 0,
  acquire: 60000,
  idle: 10000,
},
```

### Environment Variables

```bash
DB_POOL_MAX=30    # Production recommendation
```

---

## P3 Success Criteria

- [ ] JWT tokens invalidated on logout survive server restart and multi-instance deployments
- [ ] CORS rejects requests from unlisted origins in production
- [ ] `/test` and `/direct-test` return 404 in production
- [ ] MySQL pool sized ≥ 20 with configurable override

---

---

# 🟠 P4: Pluggable Data Layer

## Executive Summary

**Sprint Goal**: Replace the hardwired MySQL-only telemetry path with a pluggable adapter architecture — inspired by ThingsBoard's `DATABASE_TS_TYPE` (sql | cassandra | timescale) and EMQX's Data Bridge model. Clients choose their own time-series backend from an Admin dashboard setting. The relational layer (Organization, Device, Sensor, Rule, User, Area models) stays on MySQL unchanged.

**Inspiration**:
- **ThingsBoard**: two-tier model — PostgreSQL always holds entities; `DATABASE_TS_TYPE: sql | cassandra | timescale` selects time-series storage independently.
- **EMQX Data Bridge**: rule-engine SQL query routes each message to a configured sink adapter (Redis, MySQL, PostgreSQL, Kafka, InfluxDB).
- **AWS IoT Core**: Rules Engine fans out to DynamoDB (hot), Timestream (analytics), S3 (cold archive) — each endpoint independently configurable.

**Total Effort**: 2 weeks  
**Priority**: 🟠 High  
**Dependencies**: P3 complete

**Throughput after P4**:
- MySQL adapter (default, no new infra): ~10,000 events/sec
- TimescaleDB adapter: ~50,000–100,000 events/sec
- InfluxDB v2 adapter: ~50,000–630,000 events/sec (vendor benchmarks)

---

## Architecture Overview

```
 Protocol Layer  (HTTP / MQTT / CoAP)
        │ normalized telemetry
        ▼
 TimeSeriesRepository  (interface)
 insert() · queryLatest() · queryRange() · deleteOlderThan() · healthCheck()
        │
        │  TIMESERIES_BACKEND env var  ──────────────────┐
        │  (or SystemConfig DB row)                       │
        ▼                                                 │
 ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
 │ MySQL        │  │ TimescaleDB      │  │ InfluxDB v2       │
 │ Adapter      │  │ Adapter          │  │ Adapter           │
 │ (default)    │  │ hypertable +     │  │ Line Protocol     │
 │ no new infra │  │ time_bucket()    │  │ /api/v2/write     │
 └──────────────┘  └──────────────────┘  └──────────────────┘

 Relational tier (MySQL, unchanged in all configurations):
   Organization · Device · Sensor · Rule · User · Area · RuleChain · ...
```

The `DataStream` (telemetry) and `DeviceStateInstance` (device state history) tables move to the configured adapter. All other 19 Sequelize models remain on MySQL with no changes.

---

## P4 Issues Overview

| # | Issue | Effort | Impact | Status |
|---|-------|--------|--------|--------|
| 4.1 | `TimeSeriesRepository` interface + factory | 1 day | Foundation for all adapters | ☐ |
| 4.2 | `MySQLTimeSeriesAdapter` | 0.5 days | Default adapter — zero new infra | ☐ |
| 4.3 | `TimescaleDBAdapter` | 3 days | 5–10× write throughput; SQL + time_bucket() | ☐ |
| 4.4 | `InfluxDBv2Adapter` | 2 days | Standalone time-series; schemaless; SaaS-friendly | ☐ |
| 4.5 | `SystemConfig` model + admin selection API | 1 day | Dashboard-driven adapter selection | ☐ |
| 4.6 | Socket.io Redis adapter | 0.5 days | Multi-instance socket events | ☐ |
| 4.7 | Redis Sentinel / HA | 1 day | Eliminate Redis SPOF | ☐ |
| 4.8 | prom-client migration | 1 day | Process/GC metrics, real histograms | ☐ |

---

## 🎫 Issue 4.1: TimeSeriesRepository Interface + Factory

### Problem Statement

`dataStreamService.js` calls Sequelize/MySQL directly. Any storage engine change requires rewriting service logic. A repository interface decouples *what to store* from *where to store it* — the same pattern ThingsBoard uses to swap Cassandra, PostgreSQL, and TimescaleDB behind a common DAO interface.

### Interface Contract

```javascript
// src/repositories/timeseries/TimeSeriesRepository.js
class TimeSeriesRepository {
  async insert(rows) { throw new Error('Not implemented'); }
  async queryLatest(telemetryDataId) { throw new Error('Not implemented'); }
  async queryRange(telemetryDataId, from, to, opts = {}) { throw new Error('Not implemented'); }
  async deleteOlderThan(days) { throw new Error('Not implemented'); }
  async healthCheck() { throw new Error('Not implemented'); }
}
module.exports = TimeSeriesRepository;
```

### Factory (adapter selection at boot)

```javascript
// src/repositories/timeseries/TimeSeriesRepositoryFactory.js
const BACKEND = process.env.TIMESERIES_BACKEND || 'mysql';
const adapters = {
  mysql:     () => require('./adapters/MySQLTimeSeriesAdapter'),
  timescale: () => require('./adapters/TimescaleDBAdapter'),
  influx:    () => require('./adapters/InfluxDBAdapter'),
};
if (!adapters[BACKEND]) {
  throw new Error(`Unknown TIMESERIES_BACKEND: "${BACKEND}". Valid: mysql | timescale | influx`);
}
module.exports = new (adapters[BACKEND]())();
```

Services import the singleton — never a specific adapter:
```javascript
const tsRepo = require('../repositories/timeseries/TimeSeriesRepositoryFactory');
await tsRepo.insert(rows);   // works regardless of which backend is active
```

### Acceptance Criteria

- [ ] **AC1**: Interface and factory created; unknown `TIMESERIES_BACKEND` value throws at startup.
- [ ] **AC2**: `dataStreamService.js` and `deviceStateInstanceService.js` refactored to call `tsRepo.*` instead of Sequelize directly.
- [ ] **AC3**: `GET /api/v1/health` response includes `{ timeseries_backend: "mysql" }` from `tsRepo.healthCheck()`.
- [ ] **AC4**: `TIMESERIES_BACKEND` added to `.env.example` and `PRODUCTION-DEPLOYMENT.md`.

### Environment Variables

```bash
TIMESERIES_BACKEND=mysql   # mysql | timescale | influx  (default: mysql)
```

---

## 🎫 Issue 4.2: MySQLTimeSeriesAdapter

### Problem Statement

The default adapter wraps the existing `DataStream` Sequelize model so zero infrastructure changes are needed for clients who stay on MySQL. This is the reference implementation all other adapters must match.

### Technical Approach

```javascript
// src/repositories/timeseries/adapters/MySQLTimeSeriesAdapter.js
const TimeSeriesRepository = require('../TimeSeriesRepository');
const { DataStream } = require('../../models/initModels');
const { Op } = require('sequelize');

class MySQLTimeSeriesAdapter extends TimeSeriesRepository {
  async insert(rows) {
    return DataStream.bulkCreate(rows);
  }
  async queryLatest(telemetryDataId) {
    return DataStream.findOne({
      where: { telemetryDataId },
      order: [['receivedAt', 'DESC']],
    });
  }
  async queryRange(telemetryDataId, from, to, { limit = 1000 } = {}) {
    return DataStream.findAll({
      where: { telemetryDataId, receivedAt: { [Op.between]: [from, to] } },
      order: [['receivedAt', 'ASC']],
      limit,
    });
  }
  async deleteOlderThan(days) {
    const cutoff = new Date(Date.now() - days * 86400_000);
    return DataStream.destroy({ where: { receivedAt: { [Op.lt]: cutoff } } });
  }
  async healthCheck() {
    await DataStream.findOne({ limit: 1 });
    return { ok: true };
  }
}
module.exports = MySQLTimeSeriesAdapter;
```

### Acceptance Criteria

- [ ] **AC1**: All existing `DataStream` integration tests pass unchanged through the new adapter.
- [ ] **AC2**: `bulkCreate` used so batch writes use a single INSERT instead of N individual calls.
- [ ] **AC3**: `deleteOlderThan` respects `DATA_RETENTION_DAYS` env var (default 90).

---

## 🎫 Issue 4.3: TimescaleDBAdapter

### Problem Statement

Clients who provision PostgreSQL + TimescaleDB gain automatic time-based partitioning (hypertables), native `time_bucket()` aggregation, built-in retention policies, and 5–10× better write throughput over MySQL for append-heavy telemetry. Setting `TIMESERIES_BACKEND=timescale` enables it with no code changes to any service.

### Hypertable Setup (run once on the TimescaleDB instance)

```sql
CREATE TABLE datastream (
  id                BIGSERIAL,
  telemetry_data_id UUID             NOT NULL,
  value             DOUBLE PRECISION,
  received_at       TIMESTAMPTZ      NOT NULL
);
SELECT create_hypertable('datastream', 'received_at', chunk_time_interval => INTERVAL '1 day');
SELECT add_retention_policy('datastream', INTERVAL '90 days');

-- 1-minute continuous aggregate (kept 2 years):
CREATE MATERIALIZED VIEW datastream_1m
WITH (timescaledb.continuous) AS
  SELECT time_bucket('1 minute', received_at) AS bucket,
         telemetry_data_id,
         AVG(value) AS avg_value, COUNT(*) AS count
  FROM datastream
  GROUP BY bucket, telemetry_data_id;
SELECT add_continuous_aggregate_policy('datastream_1m',
  start_offset => INTERVAL '1 day', end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute');
```

### Technical Approach

```javascript
// src/repositories/timeseries/adapters/TimescaleDBAdapter.js
const TimeSeriesRepository = require('../TimeSeriesRepository');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.TSDB_HOST || 'localhost',
  port: parseInt(process.env.TSDB_PORT || '5432', 10),
  database: process.env.TSDB_NAME || 'aemos_timeseries',
  user: process.env.TSDB_USER,
  password: process.env.TSDB_PASSWORD,
  max: parseInt(process.env.TSDB_POOL_MAX || '20', 10),
});

class TimescaleDBAdapter extends TimeSeriesRepository {
  async insert(rows) {
    // Single parameterised bulk INSERT — not N individual calls
    const vals = rows.map((_, i) =>
      `($${i*3+1}, $${i*3+2}, $${i*3+3})`).join(',');
    const params = rows.flatMap(r => [r.telemetryDataId, r.value, r.receivedAt]);
    await pool.query(
      `INSERT INTO datastream (telemetry_data_id, value, received_at) VALUES ${vals}`,
      params
    );
  }
  async queryLatest(telemetryDataId) {
    const { rows } = await pool.query(
      `SELECT * FROM datastream WHERE telemetry_data_id = $1
       ORDER BY received_at DESC LIMIT 1`, [telemetryDataId]);
    return rows[0] || null;
  }
  async queryRange(telemetryDataId, from, to, { granularity = '1 minute', limit = 1000 } = {}) {
    const { rows } = await pool.query(
      `SELECT time_bucket($1::interval, received_at) AS bucket,
              AVG(value) AS value, COUNT(*) AS count
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
    return { ok: true };
  }
}
module.exports = TimescaleDBAdapter;
```

### Environment Variables

```bash
TIMESERIES_BACKEND=timescale
TSDB_HOST=localhost
TSDB_PORT=5432
TSDB_NAME=aemos_timeseries
TSDB_USER=aemos
TSDB_PASSWORD=your-timescaledb-password
TSDB_POOL_MAX=20
DATA_RETENTION_DAYS=90
DATA_AGGREGATE_RETENTION_DAYS=730
```

### Acceptance Criteria

- [ ] **AC1**: Adapter passes the same integration test suite as `MySQLTimeSeriesAdapter`.
- [ ] **AC2**: `queryRange` uses `time_bucket()` for granularity ≥ 1 minute.
- [ ] **AC3**: Bulk insert uses a single parameterised query (not individual INSERTs per row).
- [ ] **AC4**: TimescaleDB connection pool (`TSDB_POOL_MAX`) is independent of MySQL pool.
- [ ] **AC5**: Load test: 10,000 writes/sec sustained for 5 minutes, p99 write latency < 20ms.

---

## 🎫 Issue 4.4: InfluxDBv2Adapter

### Problem Statement

InfluxDB v2 is a standalone time-series binary — no PostgreSQL required. Its schemaless tag-set + field-set model suits high-cardinality sensor data. Clients who prefer a dedicated time-series service (or are already running InfluxDB Cloud) set `TIMESERIES_BACKEND=influx`. Benchmarks show ~630K points/sec write throughput on a single node.

**Write model**: HTTP Line Protocol (`/api/v2/write`), batched.  
**Query model**: Flux language (`|> range() |> filter() |> aggregateWindow()`).

### Technical Approach

```javascript
// src/repositories/timeseries/adapters/InfluxDBAdapter.js
const TimeSeriesRepository = require('../TimeSeriesRepository');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const client  = new InfluxDB({ url: process.env.INFLUX_URL || 'http://localhost:8086',
                                token: process.env.INFLUX_TOKEN });
const writeApi = client.getWriteApi(
  process.env.INFLUX_ORG    || 'aemos',
  process.env.INFLUX_BUCKET || 'telemetry', 'ms');
const queryApi = client.getQueryApi(process.env.INFLUX_ORG || 'aemos');

class InfluxDBAdapter extends TimeSeriesRepository {
  async insert(rows) {
    for (const r of rows) {
      writeApi.writePoint(new Point('telemetry')
        .tag('telemetryDataId', String(r.telemetryDataId))
        .floatField('value', r.value)
        .timestamp(new Date(r.receivedAt)));
    }
    await writeApi.flush();   // single HTTP round-trip for the batch
  }
  async queryLatest(telemetryDataId) {
    const flux = `from(bucket:"${process.env.INFLUX_BUCKET||'telemetry'}")
      |> range(start:-7d)
      |> filter(fn:(r) => r.telemetryDataId == "${telemetryDataId}")
      |> last()`;
    const rows = await this._query(flux);
    return rows[0] || null;
  }
  async queryRange(telemetryDataId, from, to, { granularity = '1m' } = {}) {
    const flux = `from(bucket:"${process.env.INFLUX_BUCKET||'telemetry'}")
      |> range(start:${from.toISOString()}, stop:${to.toISOString()})
      |> filter(fn:(r) => r.telemetryDataId == "${telemetryDataId}")
      |> aggregateWindow(every:${granularity}, fn:mean)`;
    return this._query(flux);
  }
  async deleteOlderThan(days) {
    // InfluxDB v2: bucket retention period is the preferred mechanism;
    // explicit delete via /api/v2/delete for manual pruning
    const stop = new Date(Date.now() - days * 86400_000).toISOString();
    await fetch(`${process.env.INFLUX_URL}/api/v2/delete?org=${process.env.INFLUX_ORG}&bucket=${process.env.INFLUX_BUCKET}`, {
      method: 'POST',
      headers: { Authorization: `Token ${process.env.INFLUX_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ start: '1970-01-01T00:00:00Z', stop, predicate: '' }),
    });
  }
  async healthCheck() {
    const res = await fetch(`${process.env.INFLUX_URL}/health`);
    if (!res.ok) throw new Error(`InfluxDB health check failed: ${res.status}`);
    return { ok: true };
  }
  _query(flux) {
    return new Promise((resolve, reject) => {
      const rows = [];
      queryApi.queryRows(flux, {
        next: (row, meta) => rows.push(meta.toObject(row)),
        error: reject,
        complete: () => resolve(rows),
      });
    });
  }
}
module.exports = InfluxDBAdapter;
```

### Environment Variables

```bash
TIMESERIES_BACKEND=influx
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your-influxdb-admin-token
INFLUX_ORG=aemos
INFLUX_BUCKET=telemetry
```

### Acceptance Criteria

- [ ] **AC1**: Adapter passes the same integration test suite as the MySQL adapter (against a real InfluxDB v2 instance in CI).
- [ ] **AC2**: All rows in a single `insert()` call are batched into one `writeApi.flush()`.
- [ ] **AC3**: Bucket retention period documented in `PRODUCTION-DEPLOYMENT.md` as the primary retention mechanism; `deleteOlderThan` is a fallback.
- [ ] **AC4**: Flux queries parameterised safely — `telemetryDataId` is a UUIDv4 (validated at route level); no Flux injection risk.

---

## 🎫 Issue 4.5: SystemConfig Model + Admin Selection API

### Problem Statement

Clients should switch their storage backend from an Admin dashboard — not only via env vars at deploy time. This mirrors ThingsBoard's System Settings UI where the `DATABASE_TS_TYPE` equivalent is a dropdown, not just a config file. The active selection is persisted in a `system_config` table and read at startup; env vars remain fallbacks.

### Data Model

```sql
CREATE TABLE system_config (
  config_key   VARCHAR(100) PRIMARY KEY,
  config_value TEXT         NOT NULL,
  description  VARCHAR(255),
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by   INT          -- FK to User
);

-- Seed defaults:
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('timeseries.backend',        'mysql',  'mysql | timescale | influx'),
  ('queue.type',                'redis',  'redis | kafka | rabbitmq'),
  ('data.retention.days',       '90',     'Raw telemetry retention in days'),
  ('device.state.retention.days','180',   'DeviceStateInstance retention in days');
```

### Admin API

```
GET  /api/v1/system/config          — list all config (System Admin only)
GET  /api/v1/system/config/:key     — get one value
PUT  /api/v1/system/config/:key     — update; returns { requiresRestart: true } for engine changes
```

### Acceptance Criteria

- [ ] **AC1**: `SystemConfig` Sequelize model and migration; table seeded with defaults.
- [ ] **AC2**: All three endpoints restricted to `System Admin` role via `checkPermission('system.config.write')`.
- [ ] **AC3**: Value validated against per-key allowlist (`timeseries.backend` → `mysql | timescale | influx`).
- [ ] **AC4**: At startup, `SystemConfig` DB values override env vars; env vars are used if DB is unreachable (graceful boot).
- [ ] **AC5**: `PUT` response includes `{ requiresRestart: true }` for `timeseries.backend` and `queue.type` changes so the frontend can show a restart banner.

---

## 🎫 Issue 4.6: Socket.io Redis Adapter

### Problem Statement

Socket.io room events only reach clients connected to the same Node.js instance. With multiple API instances, clients on other instances silently miss telemetry broadcasts.

### Acceptance Criteria

- [ ] **AC1**: `@socket.io/redis-adapter` configured using the shared `redisConnection`.
- [ ] **AC2**: Feature-flagged (`SOCKET_REDIS_ADAPTER=true`) — disabled for single-instance deployments.
- [ ] **AC3**: Integration test: emit to a room from instance A; client on instance B receives it.

### Technical Approach

```javascript
// src/utils/socketManager.js
const { createAdapter } = require('@socket.io/redis-adapter');
const redis = require('../config/redis');

if (process.env.SOCKET_REDIS_ADAPTER === 'true') {
  const subClient = redis.duplicate();
  io.adapter(createAdapter(redis, subClient));
}
```

---

## 🎫 Issue 4.7: Redis Sentinel / HA

### Problem Statement

A single Redis instance is a SPOF. Redis Sentinel provides automatic failover — if the primary fails, a replica is promoted within seconds. This is a prerequisite for any multi-instance or HA deployment.

### Acceptance Criteria

- [ ] **AC1**: IORedis configured with Sentinel when `REDIS_SENTINEL_HOSTS` is set.
- [ ] **AC2**: Existing single-host config (`REDIS_HOST`) unchanged when Sentinel is not configured.
- [ ] **AC3**: `PRODUCTION-DEPLOYMENT.md` updated with Sentinel setup guide (3-node minimum: 1 primary + 1 replica + 1 sentinel-only).

### Technical Approach

```javascript
// src/config/redis.js — Sentinel branch:
const sentinelHosts = process.env.REDIS_SENTINEL_HOSTS; // "h1:26379,h2:26379,h3:26379"
const connection = sentinelHosts
  ? new Redis({
      sentinels: sentinelHosts.split(',').map(h => {
        const [host, port] = h.split(':');
        return { host, port: parseInt(port, 10) };
      }),
      name: process.env.REDIS_SENTINEL_MASTER || 'mymaster',
      password: process.env.REDIS_PASSWORD,
    })
  : new Redis({ /* existing single-host config */ });
```

### Environment Variables

```bash
REDIS_SENTINEL_HOSTS=sentinel1:26379,sentinel2:26379,sentinel3:26379
REDIS_SENTINEL_MASTER=mymaster
```

---

## 🎫 Issue 4.8: prom-client Migration

### Problem Statement

`metricsManager.js` manually formats Prometheus text and lacks process metrics (CPU, memory, GC pause, event loop lag) and real histogram quantile calculation.

### Acceptance Criteria

- [ ] **AC1**: Replace `metricsManager.js` with `prom-client` (`collectDefaultMetrics()` enabled).
- [ ] **AC2**: All existing metric names and labels preserved — Grafana dashboards keep working.
- [ ] **AC3**: `/api/v1/metrics/prometheus` returns `prom-client` registry output.
- [ ] **AC4**: `FORBIDDEN_LABELS` cardinality guardrails enforced at metric registration time.

---

## P4 Success Criteria

- [ ] `TimeSeriesRepository` interface in place; `dataStreamService.js` and `deviceStateInstanceService.js` use factory (not Sequelize directly)
- [ ] `MySQLTimeSeriesAdapter` passes all existing integration tests unchanged
- [ ] `TIMESERIES_BACKEND=timescale` enables TimescaleDB without service code changes
- [ ] `TIMESERIES_BACKEND=influx` enables InfluxDB v2 without service code changes
- [ ] Admin `SystemConfig` API: System Admin can switch `timeseries.backend` from dashboard; `requiresRestart` returned
- [ ] Socket.io room broadcasts work across 2+ API instances
- [ ] Redis Sentinel tested in staging; automatic failover verified
- [ ] `prom-client` in place; process/GC/event-loop metrics visible in Grafana

---

---

# 🟠 P5: Protocol & Messaging Scale

## Executive Summary

**Sprint Goal**: Replace the embedded Aedes MQTT broker, introduce a pluggable message queue (managed or self-hosted), and add adaptive worker scaling so the platform pays for what it uses — a single idle server at low load, up to 100K events/sec at peak.

**Elastic design principle**: Like P4's pluggable storage backend, the message queue is also pluggable (`MESSAGE_QUEUE_TYPE=redis|kafka|rabbitmq`). Clients who need throughput over cost start with Redis BullMQ (already running), move to managed Kafka (Upstash / AWS MSK) when they hit its ceiling, and graduate to a self-hosted EMQX + Kafka cluster only at enterprise scale.

**Total Effort**: 3 weeks  
**Priority**: 🟠 High  
**Dependencies**: P4 complete

**Throughput after P5**:
- Redis queue + adaptive workers: ~20,000 events/sec (no new infra cost)
- Managed Kafka (Upstash/MSK) + adaptive workers: ~100,000 events/sec (~$20–$80/month additional)
- Self-hosted EMQX + Kafka cluster: ~100,000+ events/sec (own infra)

---

## P5 Issues Overview

| # | Issue | Effort | Impact | Status |
|---|-------|--------|--------|--------|
| 5.1 | Tiered MQTT isolation (Aedes child process → EMQX) | 2–5 days | Process isolation at zero cost; EMQX when needed | ☐ |
| 5.2 | Pluggable message queue (Redis → Kafka → RabbitMQ) | 5 days | Decouple ingest; managed or self-hosted | ☐ |
| 5.3 | Distributed cron locks (Redlock) | 1 day | Prevent duplicate cron execution | ☐ |
| 5.4 | CoAP production hardening | 2 days | Enable CoAP in production | ☐ |
| 5.5 | LwM2M protocol support | 3 days | Constrained device management | ☐ |
| 5.6 | Adaptive BullMQ worker scaling | 1 day | Scale-to-zero workers; pay per active job | ☐ |

---

## 🎫 Issue 5.1: Tiered MQTT Isolation

### Problem Statement

The embedded Aedes MQTT broker runs inside the same Node.js process as the Express API. A crash or OOM in either kills both. The real cost of replacing Aedes with EMQX is operational complexity — a new process, a YAML config, and a webhook auth integration. That cost is only worth paying when device count or scale requires it.

**Three tiers — same `MQTT_BROKER_MODE` env var:**

| Mode | What runs | When to use | New infra cost |
|------|-----------|-------------|----------------|
| `embedded` | Aedes inside API process (current) | Dev / very small deployments | $0 |
| `child` | Aedes in a separate child process (IPC) | **Minimal profile** — process isolation at $0 | $0 |
| `external` | EMQX Community (external process or container) | Standard / Enterprise — independent scaling | $0 (self-hosted) |

### Tier 1 — `child` mode: Aedes as a child process (recommended first step)

Run Aedes in a forked child process so an API crash doesn't disconnect devices. No new software; no new config.

```javascript
// src/mqtt/mqttBroker.js (child process entry point)
const aedes = require('aedes')();
const net   = require('net');
net.createServer(aedes.handle).listen(1883);
process.on('message', msg => { /* IPC from API */ });
aedes.on('publish', pkt => process.send({ type: 'publish', pkt }));
```

```javascript
// src/server.js — fork the broker instead of requiring it in-process
if (process.env.MQTT_BROKER_MODE === 'child') {
  const { fork } = require('child_process');
  const broker = fork('./src/mqtt/mqttBroker.js');
  broker.on('message', msg => messageRouter.handle(msg));
}
```

### Tier 2 — `external` mode: EMQX Community

Install EMQX (free, self-hosted) when device connections exceed ~5,000 concurrent or when independent scaling is needed. The API subscribes as an internal MQTT client.

```javascript
// src/mqtt/externalBrokerClient.js — activated when MQTT_BROKER_MODE=external
const mqtt = require('mqtt');
const client = mqtt.connect(`mqtt://${process.env.EMQX_HOST || 'localhost'}:1883`);
client.subscribe('#');
client.on('message', (topic, payload) => messageRouter.handle({ topic, payload }));
```

Device authentication: EMQX fires a webhook → `POST /api/v1/mqtt/auth` (validates DeviceToken, same as before).

### Acceptance Criteria

- [ ] **AC1**: `MQTT_BROKER_MODE=child` forks Aedes into a separate process; API ↔ broker communicate over IPC; API process crash does not disconnect devices.
- [ ] **AC2**: `MQTT_BROKER_MODE=embedded` keeps current behaviour unchanged (default — no regression).
- [ ] **AC3**: `MQTT_BROKER_MODE=external` connects to EMQX via `mqtt` npm client; device auth via EMQX webhook to `/api/v1/mqtt/auth`.
- [ ] **AC4**: All existing MQTT integration tests pass in all three modes.
- [ ] **AC5**: `MQTT_BROKER_MODE` added to `.env.example`; `PRODUCTION-DEPLOYMENT.md` documents when to use each tier.

### Environment Variables

```bash
MQTT_BROKER_MODE=embedded     # embedded | child | external  (default: embedded)
EMQX_HOST=localhost            # only used when MQTT_BROKER_MODE=external
EMQX_PORT=1883
```

### Key Architectural Paths

```
Minimal (child):
  Device → Aedes (child process, IPC) → messageRouter → services

Standard/Enterprise (external):
  Device → EMQX (external) → webhook auth → AEMOS MQTT client → messageRouter → services
```

---

## 🎫 Issue 5.2: Pluggable Message Queue

### Problem Statement

Currently every MQTT/CoAP message results in a synchronous DB write and a BullMQ job enqueue in the same request cycle. At 10,000+ messages/sec this creates backpressure that starves the rule engine. Kafka fixes this but running a self-hosted Kafka cluster is expensive and operationally heavy for small deployments.

**Solution**: same pluggable pattern as P4 storage. `MESSAGE_QUEUE_TYPE` selects the backend at startup. Clients start on `redis` (already running, zero new cost), graduate to `kafka-managed` (Upstash Kafka ~$20/mo or AWS MSK) when they need it, and move to `kafka-self-hosted` only at enterprise scale. This is identical to ThingsBoard's `TB_QUEUE_TYPE: in-memory | kafka | rabbitmq | aws-sqs | pubsub`.

**Queue tiers**:

| Type | Throughput ceiling | Cost | Best for |
|------|--------------------|------|----------|
| `redis` | ~5,000 msg/sec | $0 (already running) | Small/medium deployments |
| `kafka-managed` | ~100,000 msg/sec | ~$20–$200/month | Growing deployments; no Kafka ops |
| `kafka-self-hosted` | Unlimited | Own infra | Enterprise; full control |
| `rabbitmq` | ~50,000 msg/sec | Own infra | Existing RabbitMQ users |

### Architecture (Kafka path)

1. EMQX sends messages to Kafka topic `aemos.telemetry` (via EMQX Kafka bridge or AEMOS bridge client).
2. **IngestionWriter** service: consumes `aemos.telemetry`, batches 500 records / 100ms, bulk-inserts into the active `TimeSeriesRepository` adapter.
3. **RuleEngineFeeder** service: consumes same topic (separate consumer group), enqueues BullMQ jobs.

### Acceptance Criteria

- [ ] **AC1**: `MessageQueueFactory` (same pattern as `TimeSeriesRepositoryFactory`) returns a `QueueAdapter` based on `MESSAGE_QUEUE_TYPE`.
- [ ] **AC2**: `redis` adapter: current BullMQ + Redis path, unchanged.
- [ ] **AC3**: `kafka-managed` adapter: connects to any Kafka-compatible endpoint via `KAFKA_BROKERS` (works with Upstash, AWS MSK, Confluent Cloud, self-hosted).
- [ ] **AC4**: `IngestionWriter` and `RuleEngineFeeder` services activated only when `MESSAGE_QUEUE_TYPE=kafka-managed|kafka-self-hosted`.
- [ ] **AC5**: Kafka partition key = `organizationId` — events for the same org processed in order.
- [ ] **AC6**: Backpressure manager updated to monitor Kafka consumer lag alongside BullMQ queue depth.
- [ ] **AC7**: `SystemConfig` row `queue.type` (seeded in P4.5) controls active adapter; change requires restart.

### Environment Variables

```bash
MESSAGE_QUEUE_TYPE=redis            # redis | kafka-managed | kafka-self-hosted | rabbitmq
# Kafka (managed or self-hosted):
KAFKA_BROKERS=localhost:9092        # comma-separated; works for Upstash, MSK, self-hosted
KAFKA_CLIENT_ID=aemos-api
KAFKA_GROUP_ID_INGEST=aemos-ingest-writer
KAFKA_GROUP_ID_RULES=aemos-rule-feeder
KAFKA_TOPIC_TELEMETRY=aemos.telemetry
KAFKA_BATCH_SIZE=500
KAFKA_BATCH_LINGER_MS=100
# Upstash Kafka (managed, serverless):
KAFKA_SASL_USERNAME=                # Upstash access key
KAFKA_SASL_PASSWORD=                # Upstash secret key
```

---

## 🎫 Issue 5.3: Distributed Cron Locks (Redlock)

> **Profile note**: only needed for Standard/Enterprise (multiple API instances). Single-server Minimal deployments have one cron process by definition — skip this issue until running 2+ instances.

### Problem Statement

`ScheduleManager.js` uses `node-cron` to trigger scheduled rule chains. When multiple API instances run (after P4.6 Socket.io adapter), each instance independently fires the same cron job — causing duplicate rule chain executions.

### Acceptance Criteria

- [ ] **AC1**: Before emitting a scheduled rule chain event, `ScheduleManager` acquires a Redis lock via Redlock (`npm install redlock`).
- [ ] **AC2**: Lock key: `lock:schedule:rulechain:{ruleChainId}:{cronTick}` with TTL = 30 seconds.
- [ ] **AC3**: If lock acquisition fails (another instance won), skip emission silently (log at debug level).
- [ ] **AC4**: Lock auto-extends if rule chain emission takes > 15 seconds.
- [ ] **AC5**: Unit tests verify only one instance emits per cron tick across simulated concurrent instances.

---

## 🎫 Issue 5.6: Adaptive BullMQ Worker Scaling

### Problem Statement

`ruleEngineWorker.js` is always running with 20 concurrent workers. A farm that has 5 sensors and very low throughput still pays for 20 idle workers. At the other extreme, a spike in telemetry (e.g. all sensors reporting simultaneously after a network outage) can saturate 20 workers and delay rule evaluation.

### Technical Approach

Replace the static concurrency with a dynamic worker pool that observes queue depth and adjusts concurrency between `WORKER_MIN_CONCURRENCY` and `WORKER_MAX_CONCURRENCY`:

```javascript
// src/workers/ruleEngineWorker.js
const MIN = parseInt(process.env.WORKER_MIN_CONCURRENCY || '1', 10);
const MAX = parseInt(process.env.WORKER_MAX_CONCURRENCY || '20', 10);

let currentConcurrency = MIN;
const worker = new Worker('rule-engine', processJob, { concurrency: currentConcurrency });

// Scale check every 10 seconds
setInterval(async () => {
  const waiting = await ruleEngineQueue.getWaitingCount();
  const target = Math.min(MAX, Math.max(MIN, Math.ceil(waiting / 5)));
  if (target !== currentConcurrency) {
    worker.concurrency = target;
    currentConcurrency = target;
    logger.info(`Worker concurrency adjusted to ${target} (queue depth: ${waiting})`);
  }
}, 10_000);
```

**Scale-to-zero** (Kubernetes): with `WORKER_MIN_CONCURRENCY=0` and KEDA `ScaledObject` targeting BullMQ queue depth, the worker Deployment can scale to 0 replicas when idle and from 0 to N within ~30 seconds when jobs arrive (see P8.1).

### Acceptance Criteria

- [ ] **AC1**: Worker concurrency adjusts between `WORKER_MIN_CONCURRENCY` (default 1) and `WORKER_MAX_CONCURRENCY` (default 20) based on queue depth, checked every 10 seconds.
- [ ] **AC2**: Concurrency change logged at `info` level; observable via Prometheus metric `rule_engine_worker_concurrency`.
- [ ] **AC3**: Zero jobs lost during concurrency adjustment.
- [ ] **AC4**: `WORKER_MIN_CONCURRENCY=0` supported for KEDA-managed environments (no idle worker process).

### Environment Variables

```bash
WORKER_MIN_CONCURRENCY=1    # 0 for KEDA-managed scale-to-zero
WORKER_MAX_CONCURRENCY=20
WORKER_SCALE_CHECK_INTERVAL_MS=10000
```

---

## P5 Success Criteria

- [ ] `MQTT_BROKER_MODE=child`: API crash does not disconnect devices; IPC bridge tested
- [ ] `MQTT_BROKER_MODE=external`: EMQX handles 10,000 concurrent connections without API process involvement (Standard/Enterprise only)
- [ ] `MESSAGE_QUEUE_TYPE=redis` (default): BullMQ path unchanged; all existing tests pass
- [ ] `MESSAGE_QUEUE_TYPE=kafka-managed`: ingestion writer processing 50,000 msgs/sec; p95 write latency < 200ms
- [ ] Adaptive workers scale concurrency 1→20 in response to queue depth; Prometheus metric visible
- [ ] Redlock cron deduplication verified in multi-instance staging (not required for single-server Minimal profile)
- [ ] CoAP enabled in staging with auth hardening and rate limiting verified

---

---

# 🟡 P6: Platform Services

## Executive Summary

**Sprint Goal**: Add device lifecycle management (provisioning, OTA), an enhanced alerting engine, and a digital twin asset model — bringing AEMOS to feature parity with ThingsBoard's core platform capabilities.  
**Total Effort**: 6 weeks  
**Priority**: 🟡 Medium  
**Dependencies**: P5 complete

---

## P6 Issues Overview

| # | Issue | Effort | Status |
|---|-------|--------|--------|
| 6.1 | Device provisioning service | 2 weeks | ☐ |
| 6.2 | OTA firmware management | 2 weeks | ☐ |
| 6.3 | Alerting engine V2 | 1 week | ☐ |
| 6.4 | Digital twin / asset model | 1 week | ☐ |

---

## 🎫 Issue 6.1: Device Provisioning Service

### Problem Statement

Devices must currently be manually registered through the API before they can send telemetry. At scale, this is operationally prohibitive. Auto-provisioning allows a new device to appear on the network, authenticate with a provisioning token, receive credentials, and begin sending data — without manual intervention.

### Acceptance Criteria

- [ ] **AC1**: New table `ProvisioningToken` (`id`, `token`, `organizationId`, `deviceProfileId`, `maxUses`, `usedCount`, `expiresAt`, `status`).
- [ ] **AC2**: `POST /api/v1/provision` endpoint accepts `{ provisioningToken, deviceName, firmwareVersion }` with no JWT auth — returns a `DeviceToken` and `sensorUUID`.
- [ ] **AC3**: Provisioning creates a `Sensor` + `DeviceToken` record automatically using the org and profile associated with the provisioning token.
- [ ] **AC4**: `maxUses` enforced — provisioning token invalidated after limit reached.
- [ ] **AC5**: X.509 certificate issuance: optionally issue a client certificate signed by an org-level CA for mTLS (via `node-forge`).
- [ ] **AC6**: Provisioning audit log: every auto-provision event recorded with device name, IP, firmware version, timestamp.

---

## 🎫 Issue 6.2: OTA Firmware Management

### Acceptance Criteria

- [ ] **AC1**: New table `FirmwareBuild` (`id`, `version`, `organizationId`, `checksum`, `storageUrl`, `releaseNotes`, `createdAt`).
- [ ] **AC2**: `POST /api/v1/firmware` — upload firmware binary (multipart); stored in **local filesystem by default** (`FIRMWARE_STORAGE=local`, path configurable via `FIRMWARE_STORAGE_PATH`); S3 optional (`FIRMWARE_STORAGE=s3`) for Standard/Enterprise; checksum computed server-side.
- [ ] **AC3**: `POST /api/v1/firmware/:id/deploy` — assign firmware build to a device group or individual devices; creates `FirmwareDeployment` records.
- [ ] **AC4**: Device polls `GET /api/v1/ota/check?deviceUuid=X&currentVersion=Y` — returns `{ update: true, url, checksum, version }` or `{ update: false }`.
- [ ] **AC5**: Staged rollout: `FirmwareDeployment.targetPercent` controls what fraction of devices are offered the update.
- [ ] **AC6**: Rollback: `POST /api/v1/firmware/deployments/:id/rollback` reverts to previous version for all assigned devices.

---

## 🎫 Issue 6.3: Alerting Engine V2

### Problem Statement

The current `Notification` + `Ticket` model is a skeleton. There is no threshold-based alerting, no multi-channel delivery, and no escalation.

### Acceptance Criteria

- [ ] **AC1**: New table `AlertRule` (`id`, `organizationId`, `sensorId`, `variableName`, `operator`, `threshold`, `severity`, `channels` (JSON array), `cooldownSeconds`, `enabled`).
- [ ] **AC2**: AlertRule evaluation runs in the rule engine worker when a matching telemetry value arrives.
- [ ] **AC3**: Alert delivery channels: in-app (existing Notification), **email via self-hosted SMTP** (nodemailer + `SMTP_HOST/PORT/USER/PASS` — works with any SMTP server including a local one; third-party relay like SendGrid/SES optional for Standard/Enterprise), webhook (HTTP POST to configurable URL), MQTT publish to device.
- [ ] **AC4**: Cooldown enforcement: re-alert only after `cooldownSeconds` has elapsed since last alert for the same rule.
- [ ] **AC5**: Alert history table `AlertEvent` records all fired alerts with value, timestamp, delivered channels.
- [ ] **AC6**: Escalation: if an alert is not acknowledged within `escalationMinutes`, escalate to a secondary channel or contact.

---

## 🎫 Issue 6.4: Digital Twin / Asset Model

### Problem Statement

The current data model maps physical entities (sensors, devices, areas) but has no concept of a logical asset that aggregates multiple physical entities — e.g. a single fish tank that has a pH sensor, a DO sensor, and a water pump.

### Acceptance Criteria

- [ ] **AC1**: New table `Asset` (`id`, `organizationId`, `name`, `type`, `parentAssetId`, `metadata` JSON).
- [ ] **AC2**: `AssetSensor` and `AssetDevice` junction tables linking assets to physical entities.
- [ ] **AC3**: `GET /api/v1/assets/:id/telemetry` — returns aggregated current values for all sensors under this asset (reads from Redis latest-value cache).
- [ ] **AC4**: Asset hierarchy: an asset can have child assets (e.g. Facility → Fish Tank → Sensor). Hierarchy depth ≤ 10.
- [ ] **AC5**: Virtual sensor: an asset can define a calculated telemetry variable (e.g. `avg_pH = mean of sensor 1 and sensor 2`) evaluated on each telemetry write.

---

---

# 🟡 P7: Analytics & Intelligence

## Executive Summary

**Sprint Goal**: Expose time-series aggregation APIs, anomaly detection, and aquaponics-specific intelligence — making AEMOS a decision-support system, not just a data pipe.  
**Total Effort**: 6 weeks  
**Priority**: 🟡 Medium  
**Dependencies**: P4 complete (works with any `TIMESERIES_BACKEND`; TimescaleDB unlocks native `time_bucket()` aggregation but MySQL adapter works with SQL `GROUP BY` bucketing)

---

## P7 Issues Overview

| # | Issue | Effort | Status |
|---|-------|--------|--------|
| 7.1 | Time-series aggregation API | 2 weeks | ☐ |
| 7.2 | Anomaly detection engine | 2 weeks | ☐ |
| 7.3 | Aquaponics-specific intelligence | 1 week | ☐ |
| 7.4 | Historical data export | 1 week | ☐ |

---

## 🎫 Issue 7.1: Time-Series Aggregation API

### Acceptance Criteria

- [ ] **AC1**: `GET /api/v1/telemetry/:sensorId/aggregate` accepts `startTime`, `endTime`, `bucket` (1s/1m/1h/1d), `agg` (min/max/avg/sum/count/first/last).
- [ ] **AC2**: Aggregation is adapter-native — `TimeSeriesRepository.queryRange()` handles bucketing internally: TimescaleDB uses `time_bucket()`, MySQL uses `FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(received_at) / bucket_seconds) * bucket_seconds)`. API contract is identical regardless of backend.
- [ ] **AC3**: Multi-variable query: `GET /api/v1/telemetry/aggregate?variables=pH,DO,temperature&sensorIds=1,2,3&bucket=1m` returns all variables in one response.
- [ ] **AC4**: Response cached in Redis for 60 seconds for `bucket >= 1m` queries.
- [ ] **AC5**: Rate-limited per org: max 100 aggregate queries/minute.

---

## 🎫 Issue 7.2: Anomaly Detection Engine

### Acceptance Criteria

- [ ] **AC1**: Per-variable rolling statistics stored in Redis: `mean`, `stddev`, `min`, `max` over a configurable window (default: 24h).
- [ ] **AC2**: Z-score anomaly: flag reading if `|value - mean| / stddev > threshold` (default: 3.0).
- [ ] **AC3**: IQR anomaly: flag reading if value < `Q1 - 1.5*IQR` or > `Q3 + 1.5*IQR`.
- [ ] **AC4**: Anomaly events routed through the existing Alerting Engine V2 (P6.3) with severity `ANOMALY`.
- [ ] **AC5**: Baseline warmup: anomaly detection disabled for a variable until ≥ 100 readings are collected.
- [ ] **AC6**: Admin API to reset baselines: `DELETE /api/v1/anomaly/baseline?sensorId=X&variable=pH`.

---

## 🎫 Issue 7.3: Aquaponics-Specific Intelligence

These rules are domain-specific to aquaponics and should be implemented as built-in rule chain templates that users can import:

| Template | Logic | Action |
|----------|-------|--------|
| **pH Alert** | pH < 6.5 or > 8.0 for > 10 minutes | Alert + log |
| **DO Critical** | Dissolved oxygen < 5 mg/L | Immediate alert — fish survival risk |
| **Ammonia Spike** | NH3 > 0.5 ppm and pH > 7.5 (NH3 = f(TAN, pH, temp)) | Critical alert |
| **Temperature Band** | Temperature outside species-configured range | Alert |
| **Nitrogen Cycle** | Monitor NO2 trajectory during cycling period | Informational dashboard |
| **Feeding Automation** | Trigger feeder device at scheduled times if DO > threshold | Device command |

### Acceptance Criteria

- [ ] **AC1**: Six rule chain templates importable via `POST /api/v1/rule-chains/import`.
- [ ] **AC2**: Each template parameterized (thresholds configurable per org).
- [ ] **AC3**: Ammonia calculator implemented as a transform rule node: `NH3 = TAN / (1 + 10^(pKa - pH))` where `pKa = f(temperature)`.
- [ ] **AC4**: Dashboard panel for nitrogen cycle status (NO3/NO2/NH3 trend over 30 days).

---

## 🎫 Issue 7.4: Historical Data Export

### Acceptance Criteria

- [ ] **AC1**: `POST /api/v1/export` accepts `{ sensorIds, startTime, endTime, format: 'csv'|'json'|'parquet', variables }`.
- [ ] **AC2**: Large exports (> 100,000 rows) run as a background BullMQ job; client polls `GET /api/v1/export/:jobId/status`.
- [ ] **AC3**: Completed exports stored in **local filesystem by default** (`EXPORT_STORAGE=local`, configurable path); S3 optional (`EXPORT_STORAGE=s3`) for Standard/Enterprise. For local storage a temporary signed token (JWT, 1h TTL) is returned instead of a pre-signed S3 URL.
- [ ] **AC4**: Export rate-limited: max 5 concurrent export jobs per org.

---

---

# 🟢 P8: Enterprise & Multi-Tenancy

## Executive Summary

**Sprint Goal**: Production-grade operations, enterprise authentication, SaaS multi-tenancy, regulatory compliance — and a clearly defined elastic deployment model so AEMOS is affordable at every scale.

**Elastic principle**: every component has a defined minimum (cheapest idle state) and maximum (peak throughput). A single-farm client pays for a single VPS; an enterprise pays for a Kubernetes cluster — the same codebase, different deployment profile.

**Total Effort**: Ongoing (12+ months)  
**Priority**: 🟢 Planned  
**Dependencies**: P5 complete

---

## P8 Issues Overview

| # | Issue | Effort | Status |
|---|-------|--------|--------|
| 8.1 | Kubernetes + KEDA autoscaling (Helm charts) | 2 weeks | ☐ |
| 8.2 | Multi-region support | 4 weeks | ☐ |
| 8.3 | SSO — SAML 2.0 / OIDC | 2 weeks | ☐ |
| 8.4 | SaaS multi-tenancy + billing | 4 weeks | ☐ |
| 8.5 | Audit logging (GDPR / SOC2) | 2 weeks | ☐ |
| 8.6 | Developer portal + API docs | 2 weeks | ☐ |
| 8.7 | Elastic deployment profiles (Minimal / Standard / Enterprise) | 1 week | ☐ |

---

## 🎫 Issue 8.1: Kubernetes + KEDA Autoscaling (Helm Charts)

### Scaling model — every component has a min (cost) and max (throughput)

| Component | Min replicas | Max replicas | Scale trigger |
|-----------|-------------|-------------|---------------|
| API | 1 | 20 | CPU > 70% OR HTTP RPS > 500 |
| Rule Engine Worker | **0** | 10 | BullMQ queue depth > 0 (KEDA) |
| Ingestion Writer | **0** | 5 | Kafka consumer lag > 100 (KEDA) |
| Rule Engine Feeder | **0** | 5 | Kafka consumer lag > 100 (KEDA) |

Workers scale **to zero** when idle — no idle-worker cost. KEDA wakes them within ~30 seconds when jobs arrive. The API minimum is 1 (not 2) — a single pod is acceptable for small deployments; scale for HA only when clients need it.

### KEDA ScaledObject (Rule Engine Worker)

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rule-engine-worker
spec:
  scaleTargetRef:
    name: rule-engine-worker
  minReplicaCount: 0          # scale to zero when idle
  maxReplicaCount: 10
  cooldownPeriod: 60          # seconds idle before scaling to zero
  triggers:
    - type: redis
      metadata:
        address: redis:6379
        listName: bull:rule-engine:wait
        listLength: "5"       # 1 replica per 5 waiting jobs
```

### Acceptance Criteria

- [ ] **AC1**: Helm chart with separate Deployments: API, Rule Engine Worker, Ingestion Writer, Rule Engine Feeder.
- [ ] **AC2**: API: HPA on CPU > 70% + custom metric (HTTP RPS via KEDA Prometheus scaler); min 1, max 20.
- [ ] **AC3**: Workers (Rule Engine Worker, Ingestion Writer, Feeder): KEDA `ScaledObject`; min 0, max configurable.
- [ ] **AC4**: Liveness: `GET /api/v1/health/live`; Readiness: `GET /api/v1/health/ready` (already implemented in P0).
- [ ] **AC5**: PodDisruptionBudget: min 1 API pod available during rolling update (waived when `minReplicas=1` and PDB would block drains — configurable per profile).
- [ ] **AC6**: ConfigMap for non-secret env vars; ExternalSecrets / Kubernetes Secrets for DB/Redis/JWT credentials.
- [ ] **AC7**: VPA (VerticalPodAutoscaler) in recommendation mode on API deployment — surface right-sizing suggestions without auto-applying.
- [ ] **AC8**: CI pipeline (GitHub Actions): build Docker image → run tests → push to registry → Helm upgrade on merge to `main`.
- [ ] **AC9**: Helm `values.yaml` exposes `replicaMin`, `replicaMax`, `resources.requests`, `resources.limits` per component so a single `values-minimal.yaml` file defines the cost-optimised profile.

---

## 🎫 Issue 8.3: SSO — SAML 2.0 / OIDC

### Acceptance Criteria

- [ ] **AC1**: Support OIDC (OAuth2) login via Okta, Azure AD, or Keycloak.
- [ ] **AC2**: `POST /api/v1/auth/oidc/callback` exchanges authorization code for user profile; creates or updates `User` record; returns AEMOS JWT.
- [ ] **AC3**: Per-organization IdP configuration stored in `OrganizationSSOConfig` table.
- [ ] **AC4**: Existing username/password login unchanged; SSO is additive.

---

## 🎫 Issue 8.5: Audit Logging

### Acceptance Criteria

- [ ] **AC1**: All mutating API operations (POST, PUT, PATCH, DELETE) emit an audit event: `{ timestamp, userId, organizationId, resource, resourceId, action, changeSummary, ipAddress }`.
- [ ] **AC2**: Audit events written to a dedicated `AuditLog` MySQL table (Minimal/Standard); optionally promoted to a TimescaleDB hypertable (Enterprise) for long-term retention and fast time-range queries. `AUDIT_LOG_BACKEND=mysql|timescale` selects the target.
- [ ] **AC3**: Audit log immutable: no UPDATE or DELETE operations permitted on `AuditLog`.
- [ ] **AC4**: `GET /api/v1/audit?organizationId=X&startTime=Y&endTime=Z` — paginated audit log for System Admin and Org Admin.
- [ ] **AC5**: GDPR right-to-erasure: `POST /api/v1/gdpr/erase?userId=X` anonymizes user PII in audit logs (replaces with `[ERASED]`) rather than deleting records.

---

---

## 🎫 Issue 8.7: Elastic Deployment Profiles

### Problem Statement

There is no canonical definition of what AEMOS looks like at each cost tier. Without one, clients over-provision (paying for enterprise infra on a small farm) or under-provision (running enterprise load on a single VPS). Each profile maps directly to `TIMESERIES_BACKEND`, `MESSAGE_QUEUE_TYPE`, and Helm `values-*.yaml` files.

### Three Profiles

#### 🟢 Minimal — Single server, no Kubernetes (~$20–$50/month infra)

| Layer | Choice | Notes |
|-------|--------|-------|
| Compute | 1 Node.js process (PM2 cluster, 2–4 workers) | Single VPS / bare-metal |
| Relational DB | MySQL (same server) | `DB_POOL_MAX=10` |
| Time-series | `TIMESERIES_BACKEND=mysql` | No new infra |
| Queue | `MESSAGE_QUEUE_TYPE=redis` | Redis on same server |
| MQTT | Embedded Aedes | No EMQX |
| Socket.io | Single instance (no Redis adapter) | `SOCKET_REDIS_ADAPTER=false` |
| Redis HA | None (`REDIS_SENTINEL_HOSTS` unset) | Single Redis instance |
| Capacity | ~1,000–5,000 events/sec | Suitable for < 500 sensors |

#### 🟡 Standard — Small cluster, managed services (~$100–$300/month)

| Layer | Choice | Notes |
|-------|--------|-------|
| Compute | 2–5 API pods (Docker Compose / small K8s) | HPA CPU-based |
| Relational DB | MySQL (managed RDS / PlanetScale) | `DB_POOL_MAX=20` |
| Time-series | `TIMESERIES_BACKEND=timescale` | Timescale Cloud from ~$50/mo |
| Queue | `MESSAGE_QUEUE_TYPE=redis` or `kafka-managed` | Upstash Kafka ~$20/mo when needed |
| MQTT | EMQX Community (1 node, external process) | `ENABLE_EXTERNAL_MQTT=true` |
| Socket.io | `SOCKET_REDIS_ADAPTER=true` | Redis shared across pods |
| Redis HA | Redis Sentinel (3 nodes) | `REDIS_SENTINEL_HOSTS` set |
| Capacity | ~10,000–50,000 events/sec | Suitable for 500–50K sensors |

#### 🔴 Enterprise — Kubernetes + full cluster (~$500+/month, scales with load)

| Layer | Choice | Notes |
|-------|--------|-------|
| Compute | Kubernetes; KEDA scale-to-zero workers | HPA + KEDA per Issue 8.1 |
| Relational DB | PostgreSQL (Aurora Serverless v2) | Auto-pause at low load |
| Time-series | `TIMESERIES_BACKEND=timescale` or `influx` | Managed or self-hosted cluster |
| Queue | `MESSAGE_QUEUE_TYPE=kafka-managed` | AWS MSK or Confluent Cloud |
| MQTT | EMQX cluster (3+ nodes, LB in front) | Millions of concurrent connections |
| Socket.io | `SOCKET_REDIS_ADAPTER=true` | Redis Cluster |
| Redis HA | Redis Cluster (3 primary + 3 replica) | `REDIS_CLUSTER_NODES` |
| Capacity | 100,000–10,000,000+ events/sec | No hard ceiling with autoscaling |

### Helm Values Files

```
helm/
  values.yaml                 ← base defaults (minimal profile)
  values-standard.yaml        ← override for standard profile
  values-enterprise.yaml      ← override for enterprise profile
```

Operators run `helm upgrade aemos . -f values-standard.yaml` to apply a profile. Upgrading a profile does not require code changes — only infrastructure provisioning and env var updates.

### Acceptance Criteria

- [ ] **AC1**: Three `values-*.yaml` files in the Helm chart covering Minimal, Standard, Enterprise resource requests/limits and replica counts.
- [ ] **AC2**: `PRODUCTION-DEPLOYMENT.md` updated with a "Choose your profile" section linking env vars to each tier.
- [ ] **AC3**: Admin dashboard "System Overview" page shows current active profile (derived from `SystemConfig` values) and estimated capacity.
- [ ] **AC4**: Upgrading from Minimal → Standard requires no data migration (MySQL adapter still works; existing MySQL data accessible; operator adds TimescaleDB when ready).

---

## 📊 Throughput Milestone Summary

| After Sprint | Min-cost baseline | At full scale | Key enabler |
|-------------|-------------------|---------------|-------------|
| Now (P0–P2) | ~1,000 evt/sec | ~1,000 evt/sec | Single Node.js + MySQL + Aedes |
| After P3 | ~1,000 evt/sec | ~1,000 evt/sec | Security hardened, safe for production |
| After P4 | ~1,000 evt/sec (MySQL) | ~100K evt/sec (InfluxDB) | Pluggable storage; client chooses tier |
| After P5 | ~5,000 evt/sec (Redis queue) | ~100K evt/sec (Kafka) | Pluggable queue + adaptive workers |
| After P6–P7 | ~10,000 evt/sec | ~1,000,000 evt/sec | Platform services + analytics layer |
| After P8 | ~1,000 evt/sec (scale-to-zero) | 10,000,000+ evt/sec | KEDA + elastic profiles + multi-region |

---

## 🔗 Related Documents

- `docs/real-time-dashboard-architecture.md` — Real-time dashboard design (feeds into P3.5, P4.1)
- `docs/real-time-dashboard-tasks.md` — Phased task plan for dashboard (P3.5 scope)
- `docs/PRODUCTION-DEPLOYMENT.md` — Current production checklist (update with each sprint)
- `docs/PROMETHEUS-METRICS.md` — Metrics reference (extends in P4.6)
- `docs/P1-WORK-PLAN-STATUS.md` — P1 completion record
- `docs/architecture-assessment.md` — Protocol routing assessment (P5 EMQX plan builds on this)
