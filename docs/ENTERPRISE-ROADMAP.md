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
| **P4** | Data layer evolution | 2 weeks | Handle 100× current telemetry volume | 🟠 High |
| **P5** | Protocol & messaging scale | 3 weeks | 100,000 events/sec | 🟠 High |
| **P6** | Platform services | 6 weeks | Full IoT device lifecycle | 🟡 Medium |
| **P7** | Analytics & intelligence | 6 weeks | Aquaponics-specific ML + reporting | 🟡 Medium |
| **P8** | Enterprise | Ongoing | SaaS, multi-region, compliance | 🟢 Planned |

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

# 🟠 P4: Data Layer Evolution

## Executive Summary

**Sprint Goal**: Decouple time-series telemetry from MySQL so the platform can absorb 10× the current write volume without data layer changes downstream.  
**Total Effort**: 2 weeks  
**Priority**: 🟠 High  
**Dependencies**: P3 complete

**Throughput after P4**: ~10,000 events/sec

---

## P4 Issues Overview

| # | Issue | Effort | Impact | Status |
|---|-------|--------|--------|--------|
| 4.1 | Introduce TimescaleDB (PostgreSQL) for telemetry | 5 days | Primary scale enabler | ☐ |
| 4.2 | Migrate MySQL → PostgreSQL for relational data | 3 days | Consolidate on single engine | ☐ |
| 4.3 | Add Socket.io Redis adapter | 0.5 days | Multi-instance socket events | ☐ |
| 4.4 | Redis Sentinel / HA | 1 day | Eliminate Redis SPOF | ☐ |
| 4.5 | Data retention policies | 1 day | Prevent unbounded DataStream growth | ☐ |
| 4.6 | prom-client migration | 1 day | Process/GC metrics, real histograms | ☐ |

---

## 🎫 Issue 4.1: TimescaleDB for Telemetry

### Problem Statement

`DataStream` is stored in MySQL with no partitioning. At 1,000 events/sec the table grows by 86 million rows per day. "Latest value per telemetry variable" queries (used by the real-time dashboard) require `ORDER BY receivedAt DESC LIMIT 1` which degrades as the table grows.

TimescaleDB is a PostgreSQL extension that provides:
- Automatic time-based partitioning (hypertables)
- Efficient time-range queries and `time_bucket` aggregation
- Built-in retention and downsampling policies
- Full SQL compatibility — the existing Sequelize queries continue to work

### Acceptance Criteria

- [ ] **AC1**: `DataStream` table migrated to TimescaleDB hypertable, partitioned by `receivedAt` (chunk interval: 1 day).
- [ ] **AC2**: All existing `DataStream` writes and reads continue to work via Sequelize (no API change).
- [ ] **AC3**: Retention policy: keep 90 days of raw data; continuous aggregate to 1-minute buckets retained 2 years.
- [ ] **AC4**: Dual-write period: new DataStream rows write to both MySQL and TimescaleDB during migration; cut over read path once validated.
- [ ] **AC5**: Dashboard Redis write-through (Phase 2 of real-time dashboard plan) integrated at the same time.
- [ ] **AC6**: Load test: sustain 5,000 writes/sec for 10 minutes without latency degradation.

### Technical Approach

**Step 1: Add TimescaleDB PostgreSQL connection** (`src/config/timescaledb.js`):
```javascript
const { Sequelize } = require('sequelize');
module.exports = new Sequelize(
  process.env.TSDB_NAME || 'aemos_timeseries',
  process.env.TSDB_USER,
  process.env.TSDB_PASSWORD,
  {
    host: process.env.TSDB_HOST,
    port: parseInt(process.env.TSDB_PORT || '5432', 10),
    dialect: 'postgres',
    pool: { max: 20, min: 2, acquire: 60000, idle: 10000 },
    logging: false,
  }
);
```

**Step 2: Define DataStream model on TimescaleDB**:
```javascript
// src/models/timeseries/DataStream.ts
// Same fields as MySQL DataStream; hypertable DDL run at migration:
// SELECT create_hypertable('DataStream', 'receivedAt');
// SELECT add_retention_policy('DataStream', INTERVAL '90 days');
```

**Step 3: Dual-write in `dataStreamService.js`**:
```javascript
async function create(data) {
  const [mysqlRow] = await Promise.allSettled([
    DataStreamMySQL.create(data),
    DataStreamTimescale.create(data),
  ]);
  return mysqlRow.value; // Return MySQL result during migration
}
```

**Step 4: Cut over read path** once TimescaleDB has 7 days of data and query latency is verified.

### Environment Variables

```bash
TSDB_HOST=localhost
TSDB_PORT=5432
TSDB_NAME=aemos_timeseries
TSDB_USER=aemos
TSDB_PASSWORD=your-timescaledb-password
TSDB_DUAL_WRITE=true    # Enable dual-write during migration
TSDB_READ_PRIMARY=false  # Set true after cut-over validation
```

---

## 🎫 Issue 4.2: Migrate MySQL → PostgreSQL for Relational Data

### Problem Statement

Migrating to PostgreSQL consolidates both relational and time-series data on a single engine (PostgreSQL + TimescaleDB extension). This eliminates MySQL-specific ORM quirks, unlocks better JSON operators, window functions, and the `pg` driver which is better supported in Node.js.

### Acceptance Criteria

- [ ] **AC1**: All 21 Sequelize models migrated to PostgreSQL dialect.
- [ ] **AC2**: All existing tests pass against PostgreSQL.
- [ ] **AC3**: Sequelize CLI migration baseline created for the full schema.
- [ ] **AC4**: `DB_DIALECT` env var controls which DB engine is used (for local dev compatibility during transition).
- [ ] **AC5**: `PRODUCTION-DEPLOYMENT.md` updated with PostgreSQL connection requirements.

### Files to Modify

- `src/config/database.js` — change dialect to `postgres`, use `pg` driver
- `src/models/*.js` — update any MySQL-specific column types (`TEXT` → `JSONB` for JSON fields where appropriate)
- `package.json` — add `pg`, `pg-hstore`; remove `mysql2` after cut-over

---

## 🎫 Issue 4.3: Socket.io Redis Adapter

### Problem Statement

Socket.io room events (e.g. `broadcastToRoom('telemetry-123', ...)`) only reach clients connected to the same Node.js instance. With multiple API instances, clients on other instances silently miss events.

### Acceptance Criteria

- [ ] **AC1**: `@socket.io/redis-adapter` configured on the Socket.io server using the shared `redisConnection`.
- [ ] **AC2**: Feature-flagged (`SOCKET_REDIS_ADAPTER=true`) so it can be disabled during single-instance deployments.
- [ ] **AC3**: Integration test verifies that emitting to a room from one instance is received by a client connected to another (tested with two in-process server instances sharing Redis).

### Technical Approach

```javascript
// src/utils/socketManager.js
const { createAdapter } = require('@socket.io/redis-adapter');
const redis = require('../config/redis');

if (process.env.SOCKET_REDIS_ADAPTER === 'true') {
  const pubClient = redis;                    // existing connection
  const subClient = redis.duplicate();        // dedicated sub connection
  io.adapter(createAdapter(pubClient, subClient));
}
```

---

## 🎫 Issue 4.4: Redis Sentinel / HA

### Problem Statement

A single Redis instance is a SPOF. Redis Sentinel provides automatic failover: if the primary fails, a replica is promoted within seconds.

### Acceptance Criteria

- [ ] **AC1**: IORedis configured with Sentinel connection when `REDIS_SENTINEL_HOSTS` env var is set.
- [ ] **AC2**: Existing single-host config (`REDIS_HOST`) continues to work unchanged when Sentinel is not configured.
- [ ] **AC3**: `PRODUCTION-DEPLOYMENT.md` updated with Sentinel setup guide.

### Technical Approach

```javascript
// src/config/redis.js — add Sentinel support:
const sentinelHosts = process.env.REDIS_SENTINEL_HOSTS; // "host1:26379,host2:26379"
const connection = sentinelHosts
  ? new Redis({
      sentinels: sentinelHosts.split(',').map(h => {
        const [host, port] = h.split(':');
        return { host, port: parseInt(port, 10) };
      }),
      name: process.env.REDIS_SENTINEL_MASTER || 'mymaster',
      password: process.env.REDIS_PASSWORD,
    })
  : new Redis({ host, port, password, lazyConnect: true, enableOfflineQueue: false });
```

---

## 🎫 Issue 4.5: Data Retention Policies

### Problem Statement

`DataStream` and `DeviceStateInstance` have no TTL or archival strategy. At 1,000 events/sec the `DataStream` table adds 86M rows/day. Without retention, query performance and storage costs grow unboundedly.

### Acceptance Criteria

- [ ] **AC1**: TimescaleDB retention policy: keep 90 days raw, 2 years of 1-minute aggregates.
- [ ] **AC2**: A `node-cron` job (or TimescaleDB background job) runs nightly to archive rows older than `DATA_RETENTION_DAYS` to S3 or a cold-storage bucket in NDJSON format.
- [ ] **AC3**: `DeviceStateInstance` rows with `toTimestamp` older than `DEVICE_STATE_RETENTION_DAYS` (default 180 days) are pruned weekly.
- [ ] **AC4**: All retention periods configurable via env vars.

### Environment Variables

```bash
DATA_RETENTION_DAYS=90              # Raw DataStream retention
DATA_AGGREGATE_RETENTION_DAYS=730   # 1-minute aggregate retention
DEVICE_STATE_RETENTION_DAYS=180     # DeviceStateInstance retention
COLD_STORAGE_S3_BUCKET=             # Optional S3 bucket for archives
```

---

## 🎫 Issue 4.6: prom-client Migration

### Problem Statement

`metricsManager.js` manually formats Prometheus text. It lacks process metrics (CPU, memory, GC pause, event loop lag) and real histogram buckets with correct quantile calculation.

### Acceptance Criteria

- [ ] **AC1**: Replace `metricsManager.js` with `prom-client` (default metrics enabled for process/GC/event loop).
- [ ] **AC2**: All 12 existing metrics recreated with identical names and labels so existing Grafana dashboards keep working.
- [ ] **AC3**: `timeoutMetrics.js` metrics merged into prom-client counters.
- [ ] **AC4**: `/api/v1/metrics/prometheus` endpoint returns `prom-client` registry output.
- [ ] **AC5**: Cardinality guardrails retained — `FORBIDDEN_LABELS` enforced at metric definition time.

---

## P4 Success Criteria

- [ ] TimescaleDB accepting DataStream writes; dual-write verified for 7 days
- [ ] PostgreSQL migration complete; all tests pass
- [ ] Socket.io room broadcasts work correctly with 2+ API instances
- [ ] Redis Sentinel configured for staging environment
- [ ] Data retention policies active; oldest DataStream rows scheduled for pruning
- [ ] `prom-client` in place; process/GC metrics visible in Grafana

---

---

# 🟠 P5: Protocol & Messaging Scale

## Executive Summary

**Sprint Goal**: Replace the embedded Aedes MQTT broker and introduce a Kafka ingestion pipeline to reach 100,000 events/sec.  
**Total Effort**: 3 weeks  
**Priority**: 🟠 High  
**Dependencies**: P4 complete

**Throughput after P5**: ~100,000 events/sec

---

## P5 Issues Overview

| # | Issue | Effort | Impact | Status |
|---|-------|--------|--------|--------|
| 5.1 | Replace Aedes with EMQX | 5 days | Horizontally scalable MQTT | ☐ |
| 5.2 | Kafka ingestion pipeline | 5 days | Decouple ingest from processing | ☐ |
| 5.3 | Distributed cron locks (Redlock) | 1 day | Prevent duplicate cron execution | ☐ |
| 5.4 | CoAP production hardening | 2 days | Enable CoAP in production | ☐ |
| 5.5 | LwM2M protocol support | 3 days | Constrained device management | ☐ |

---

## 🎫 Issue 5.1: Replace Aedes with EMQX

### Problem Statement

The embedded Aedes MQTT broker runs inside the same Node.js process as the Express API. A crash, OOM, or high CPU usage in the API process kills the broker — and vice versa. The broker also cannot be scaled independently; all device connections are pinned to a single server.

EMQX Community Edition is an Erlang-based, open-source MQTT broker that handles millions of concurrent connections at sub-millisecond latency and can be clustered horizontally.

### Acceptance Criteria

- [ ] **AC1**: EMQX runs as an external process (Docker container or binary) on port 1883.
- [ ] **AC2**: AEMOS API subscribes to EMQX as an internal MQTT client (using the existing `mqtt` npm package), replacing the message ingestion path that previously used the Aedes in-process event emitter.
- [ ] **AC3**: Device authentication routed through EMQX webhook → AEMOS `/api/v1/mqtt/auth` endpoint (validates DeviceToken as before).
- [ ] **AC4**: `aedes` npm package removed from `package.json`; `mqttService.js` refactored.
- [ ] **AC5**: All existing MQTT integration tests pass.
- [ ] **AC6**: Feature-flag `ENABLE_EXTERNAL_MQTT=true` controls which path is active during cutover.

### Key Architectural Change

```
Before:
  Device → Aedes (in-process) → messageRouter → services

After:
  Device → EMQX (external) → EMQX webhook (auth) → AEMOS MQTT client → messageRouter → services
```

---

## 🎫 Issue 5.2: Kafka Ingestion Pipeline

### Problem Statement

Currently, every MQTT/CoAP message results in a synchronous DB write (DataStream insert) and a BullMQ job enqueue in the same request cycle. At 10,000+ messages/sec this creates backpressure that starves the rule engine queue.

Kafka decouples ingestion from processing:
1. EMQX sends messages to Kafka (via EMQX Kafka bridge or AEMOS bridge consumer).
2. A dedicated **Ingestion Writer** service batches Kafka records and writes to TimescaleDB.
3. A dedicated **Rule Engine Feeder** service reads from the same Kafka topic and emits BullMQ jobs.

### Acceptance Criteria

- [ ] **AC1**: A Kafka topic `aemos.telemetry` receives all device telemetry (normalized by existing adapters).
- [ ] **AC2**: `IngestionWriter` service: consumes `aemos.telemetry`, batches by 500 records or 100ms, bulk-inserts into TimescaleDB.
- [ ] **AC3**: `RuleEngineFeeder` service: consumes same topic (separate consumer group), enqueues BullMQ jobs — replacing the current `RuleEngineEventBus.emit` call in the HTTP path.
- [ ] **AC4**: Kafka partition key = `organizationId` so events for the same org are processed in order.
- [ ] **AC5**: Backpressure manager updated to monitor Kafka consumer lag (in addition to BullMQ queue depth).
- [ ] **AC6**: `ENABLE_KAFKA=true` feature flag; falls back to current direct-write path when disabled.

### Environment Variables

```bash
ENABLE_KAFKA=false              # Enable Kafka pipeline
KAFKA_BROKERS=localhost:9092    # Comma-separated broker list
KAFKA_CLIENT_ID=aemos-api
KAFKA_GROUP_ID_INGEST=aemos-ingestion-writer
KAFKA_GROUP_ID_RULES=aemos-rule-engine-feeder
KAFKA_TOPIC_TELEMETRY=aemos.telemetry
KAFKA_BATCH_SIZE=500
KAFKA_BATCH_LINGER_MS=100
```

---

## 🎫 Issue 5.3: Distributed Cron Locks (Redlock)

### Problem Statement

`ScheduleManager.js` uses `node-cron` to trigger scheduled rule chains. When multiple API instances run (after P4 Socket.io adapter), each instance independently fires the same cron job — causing duplicate rule chain executions.

### Acceptance Criteria

- [ ] **AC1**: Before emitting a scheduled rule chain event, `ScheduleManager` acquires a Redis lock via Redlock (`npm install redlock`).
- [ ] **AC2**: Lock key: `lock:schedule:rulechain:{ruleChainId}:{cronTick}` with TTL = 30 seconds.
- [ ] **AC3**: If lock acquisition fails (another instance won), skip emission silently (log at debug level).
- [ ] **AC4**: Lock auto-extends if rule chain emission takes > 15 seconds.
- [ ] **AC5**: Unit tests verify only one instance emits per cron tick across simulated concurrent instances.

---

## P5 Success Criteria

- [ ] EMQX handling 10,000 concurrent device connections without API process involvement
- [ ] Kafka ingestion pipeline processing 50,000 msgs/sec; ingestion writer p95 latency < 200ms
- [ ] Zero duplicate cron executions observed in multi-instance staging deployment
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
- [ ] **AC2**: `POST /api/v1/firmware` — upload firmware binary (multipart); stored in S3 or local storage; checksum computed server-side.
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
- [ ] **AC3**: Alert delivery channels: in-app (existing Notification), email (nodemailer/SendGrid), webhook (HTTP POST to configurable URL), MQTT publish to device.
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
**Dependencies**: P4 (TimescaleDB) complete

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
- [ ] **AC2**: Queries run against TimescaleDB using `time_bucket()` continuous aggregates.
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
- [ ] **AC3**: Completed exports stored in S3 or local storage with a signed URL returned on completion.
- [ ] **AC4**: Export rate-limited: max 5 concurrent export jobs per org.

---

---

# 🟢 P8: Enterprise & Multi-Tenancy

## Executive Summary

**Sprint Goal**: Production-grade operations, enterprise authentication, SaaS multi-tenancy, and regulatory compliance.  
**Total Effort**: Ongoing (12+ months)  
**Priority**: 🟢 Planned  
**Dependencies**: P5 complete

---

## P8 Issues Overview

| # | Issue | Effort | Status |
|---|-------|--------|--------|
| 8.1 | Kubernetes deployment (Helm charts) | 2 weeks | ☐ |
| 8.2 | Multi-region support | 4 weeks | ☐ |
| 8.3 | SSO — SAML 2.0 / OIDC | 2 weeks | ☐ |
| 8.4 | SaaS multi-tenancy + billing | 4 weeks | ☐ |
| 8.5 | Audit logging (GDPR / SOC2) | 2 weeks | ☐ |
| 8.6 | Developer portal + API docs | 2 weeks | ☐ |

---

## 🎫 Issue 8.1: Kubernetes Deployment

### Acceptance Criteria

- [ ] **AC1**: Helm chart with separate deployments for: API, Rule Engine Worker, Ingestion Writer, Rule Engine Feeder.
- [ ] **AC2**: HorizontalPodAutoscaler on API deployment (CPU threshold: 70%; min: 2, max: 20).
- [ ] **AC3**: Liveness probe: `GET /api/v1/health/liveness`; Readiness probe: `GET /api/v1/health/readiness`.
- [ ] **AC4**: ConfigMap for non-secret env vars; ExternalSecrets or Kubernetes Secrets for DB/Redis/JWT credentials.
- [ ] **AC5**: PodDisruptionBudget: min 1 API pod available during rolling update.
- [ ] **AC6**: CI pipeline (GitHub Actions) builds Docker image, runs tests, pushes to registry, and triggers Helm upgrade on merge to `main`.

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
- [ ] **AC2**: Audit events written to a dedicated `AuditLog` table (TimescaleDB hypertable, partitioned by `timestamp`).
- [ ] **AC3**: Audit log immutable: no UPDATE or DELETE operations permitted on `AuditLog`.
- [ ] **AC4**: `GET /api/v1/audit?organizationId=X&startTime=Y&endTime=Z` — paginated audit log for System Admin and Org Admin.
- [ ] **AC5**: GDPR right-to-erasure: `POST /api/v1/gdpr/erase?userId=X` anonymizes user PII in audit logs (replaces with `[ERASED]`) rather than deleting records.

---

---

## 📊 Throughput Milestone Summary

| After Sprint | Events/sec | Key Enabler |
|-------------|------------|-------------|
| Now (P0–P2) | ~1,000 | Single Node.js + MySQL + Aedes |
| After P3 | ~1,000 | Security hardened — same throughput, safe for production |
| After P4 | ~10,000 | TimescaleDB + multi-instance + Redis HA |
| After P5 | ~100,000 | EMQX cluster + Kafka pipeline |
| After P6–P7 | ~1,000,000 | Distributed processing + optimized write path |
| After P8 | 10,000,000+ | Kubernetes autoscaling + multi-region |

---

## 🔗 Related Documents

- `docs/real-time-dashboard-architecture.md` — Real-time dashboard design (feeds into P3.5, P4.1)
- `docs/real-time-dashboard-tasks.md` — Phased task plan for dashboard (P3.5 scope)
- `docs/PRODUCTION-DEPLOYMENT.md` — Current production checklist (update with each sprint)
- `docs/PROMETHEUS-METRICS.md` — Metrics reference (extends in P4.6)
- `docs/P1-WORK-PLAN-STATUS.md` — P1 completion record
- `docs/architecture-assessment.md` — Protocol routing assessment (P5 EMQX plan builds on this)
