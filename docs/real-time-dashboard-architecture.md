# Real-Time Sensor & Device Dashboard – Architectural Plan

Architectural plan for a scalable, efficient, real-time dashboard that shows current sensor and device state for all entities the user is allowed to see, with RBAC and feature-flag gating. No implementation in this document; implementation follows this plan.

---

## 1. Goals and Constraints

| Goal | Constraint |
|------|------------|
| **Scalable** | Design must support horizontal scaling (multiple API instances, optional separate real-time layer). |
| **Efficient** | Minimize server-side computation and DB load; reuse existing sockets for incremental updates. |
| **Real-time** | Dashboard table shows “current” values; updates pushed when data changes (sockets), not only on full refresh. |
| **RBAC** | All data and APIs scoped by existing RBAC (permissions + organization membership). |
| **Feature flag** | Dashboard feature only available when a dedicated feature flag is enabled. |

---

## 2. Current State (Relevant Pieces)

### 2.1 Data model (summary)

- **Sensors** – Belong to organization (via Area/Sensor). Have **TelemetryData** (variableName, sensorId). Latest value per variable: **DataStream** (value, telemetryDataId, recievedAt) – “latest” = order by recievedAt DESC, limit 1.
- **Devices** – Belong to organization (via Area/Device). Have **DeviceState** (deviceId, stateName). Current value per state: **DeviceStateInstance** (deviceStateId, value, fromTimestamp, toTimestamp) – “current” = toTimestamp IS NULL or latest by fromTimestamp.
- **RBAC** – `sensor.view` / `device.view`; org scoping via `organizationId` (query or path); `checkResourceOwnership` for single-resource access; System Admin can access any org.
- **Sockets** – Socket.io via `socketManager`: `broadcastToRoom(room, event, data)`, `broadcastToAll(event, data)`. Rooms in use:
  - `telemetry-{telemetryDataId}` – `new-datastream` when DataStream created.
  - `datastreams-update` (broadcast) – bulk datastream updates.
  - `device-uuid-{deviceUuid}`, `device-{deviceId}` – `device-state-change` when device state changes.
- **Feature flags** – `featureFlagService.isFeatureEnabled(featureName, context)`; config in `config/features.js`; supports local flags and Unleash.

### 2.2 Gaps for “dashboard table of all sensors/devices with current value”

- No single API that returns “all sensors (or devices) for an org with latest value” in one shot.
- No defined socket contract for “dashboard: here is the latest value for sensor/device X” that the UI can subscribe to per-org or per-entity.
- No feature flag for “real-time dashboard” yet.
- Socket rooms today are telemetry- or device-centric, not org-centric for dashboard use.

### 2.3 DB tables used in this plan

All table names below match Sequelize `tableName` in the codebase.

| Table | Role in dashboard plan |
|-------|-------------------------|
| **Organization** | RBAC: scope data by org; user must have access to this org. |
| **Area** | Links to Organization (`organizationId`). Used to resolve which sensors/devices belong to an org. |
| **AreaSensor** | Join table: Area ↔ Sensor. Used to get sensors for an organization (Area → AreaSensor → Sensor). |
| **AreaDevice** | Join table: Area ↔ Device. Used to get devices for an organization (Area → AreaDevice → Device). |
| **Sensor** | Entity shown on dashboard. Attributes: id, name, uuid, status, etc. |
| **TelemetryData** | One row per sensor variable (sensorId, variableName, datatype). Links Sensor to streamed values. |
| **DataStream** | Latest value per telemetry variable: telemetryDataId, value, recievedAt. "Current" sensor value = latest row per telemetryDataId (ORDER BY recievedAt DESC, LIMIT 1). |
| **Device** | Entity shown on dashboard. Attributes: id, name, uuid, status, deviceType, etc. |
| **DeviceState** | One row per device state (deviceId, stateName). Links Device to state instances. |
| **DeviceStateInstance** | Current value per state: deviceStateId, value, fromTimestamp, toTimestamp. "Current" device value = latest instance per deviceStateId (toTimestamp IS NULL or ORDER BY fromTimestamp DESC, LIMIT 1). |
| **User** | Auth; RBAC checks (who is requesting). |
| **OrganizationUser** | Links User to Organization (and role). Used to verify user can access an org. |
| **Role** | RBAC: user's role in an org. |
| **Permission** | RBAC: permission definitions (e.g. sensor.view, device.view). |
| **RolePermission** | Join: Role ↔ Permission. Used to check sensor.view / device.view. |

**Read-only for dashboard:** The dashboard only reads from these tables; it does not write. Writes (DataStream, DeviceStateInstance) come from existing ingestion and rule-engine flows.

**No new tables** are required for this plan; all of the above already exist.

### 2.4 Existing caching (consistency)

The codebase already uses **Redis** for caching and messaging; the dashboard design must align with this.

| Use | Where | Pattern |
|-----|--------|---------|
| **Rule chain index** | `RuleChainIndex.js` | Redis keys `rulechain:var:sensor:{uuid}:{varName}` (and device) → rule chain IDs; TTL 3600s; read-through with DB rebuild on miss. |
| **Queues** | BullMQ (rule engine worker) | Redis as queue backend; same `redisConnection`. |
| **Pub/sub** | `notificationBridgeService` | Redis for cross-process notifications (worker → API). |
| **Token cache** | `deviceTokenService` | In-memory Map with TTL (device token validation). |

There is **no** existing Redis cache for "latest sensor value" or "latest device state"; those are currently read from DB (DataStream, DeviceStateInstance) only when needed (e.g. rule engine). For the dashboard at scale, we extend Redis usage to a **latest-value cache** (see §3.3 and §4.6) so the dashboard does not hammer the DB.

---

## 3. High-Level Architecture

### 3.1 Data flow (two phases)

1. **Initial load (dashboard open)**  
   - Client calls a new **dashboard API** (e.g. `GET /api/dashboard/telemetry?organizationId=1`) with RBAC + feature flag.  
   - Server returns a **snapshot**: list of sensors (and/or devices) the user may see, each with **current value** (and optional timestamp).  
   - **Snapshot source:** **Redis latest-value cache** (see §3.3 and §4.6). Dashboard API reads current values from Redis; it does **not** query DataStream / DeviceStateInstance for "latest per entity" at request time. Entity list (sensors/devices for org) still comes from DB. On cache miss (e.g. cold start), optional fallback: read once from DB and backfill Redis.

2. **Incremental updates (after load)**  
   - When a sensor value or device state **changes**, existing pipelines already emit:
     - DataStream creation → `new-datastream` to `telemetry-{telemetryDataId}` (and optionally `datastreams-update` broadcast).
     - Device state change → `device-state-change` to `device-uuid-{uuid}` and `device-{id}`.
   - **Reuse these events** for the dashboard: client subscribes to the same events (or a thin “dashboard” wrapper). For each event, client updates the corresponding row in the table (by telemetryId/sensorId or deviceId).  
   - Optionally, server can **also** emit to an **org-level room** (e.g. `org-{organizationId}-dashboard`) with a small payload (id + latest value + ts) so the client can subscribe to one room per org and update the table. That keeps one subscription per org and minimizes client logic.

### 3.2 Principles

- **Single source of truth for “current” value** – **DB** (DataStream / DeviceStateInstance) for durability. **Redis** holds the **latest-value cache** for dashboard reads so the DB is not hammered by snapshot requests.
- **Reuse existing socket events** – No duplicate “write” path: ingestion/rule engine continue to write DB and emit as today; dashboard consumes those events.
- **RBAC at API and room level** – Dashboard API returns only data the user is allowed to see. If we add org rooms, only users who joined `org-{orgId}-dashboard` (after auth) receive events for that org.
- **Feature flag** – All dashboard endpoints and, if we add it, org-dashboard room join are behind a feature flag (e.g. `realtime-dashboard`).

### 3.3 Scale: why DB-only snapshot would hammer the DB (and how we avoid it)

**Concern:** If millions of sensors send telemetry every second, DataStream (and similarly DeviceStateInstance) are written at very high rate. If the dashboard API answered every request by querying "latest DataStream per telemetryDataId" (or "latest DeviceStateInstance per deviceStateId") from the DB, then:

- Each dashboard load would run heavy aggregated queries (e.g. window functions or many indexed lookups) over tables that are already under heavy write load.
- With many concurrent users or frequent refreshes, read load would compound and compete with write load, hurting latency and throughput.
- At scale, this would **badly hammer the DB** and is not acceptable.

**Approach:** The dashboard **must not** use the DB as the source for "current value" at request time. Instead:

1. **Latest-value cache in Redis** – When we **write** a new DataStream row or DeviceStateInstance row (existing ingestion and rule-engine paths), we **also** update a Redis key with the latest value (and timestamp). So Redis holds the "current" value per telemetry variable and per device state.
2. **Dashboard API reads from Redis** – The dashboard snapshot API resolves the list of sensors/devices the user can see (from DB), then **fetches current values from Redis** (e.g. MGET by key). No "latest DataStream/DeviceStateInstance" query at request time.
3. **DB remains source of truth for durability** – All writes still go to the DB first (or DB + Redis in the same flow). Redis is a read cache for "latest" only; cold start or cache miss can backfill from DB once and then rely on writes to keep Redis updated.

This is **consistent with existing architecture**: you already use Redis for caching (rule chain index) and for queues/pub-sub. The plan extends that same Redis usage to a **latest-value cache** with a **write-through** update wherever DataStream or DeviceStateInstance is written. No new cache system; same Redis, same connection and config.

---

## 4. Component Design

### 4.1 Feature flag

- **Name** – e.g. `realtime-dashboard` (or `real-time-dashboard`).
- **Where** – Use existing `featureFlagService.isFeatureEnabled('realtime-dashboard', context)`.
- **Context** – Can pass `userId` and/or `organizationId` if you later want per-org or per-user rollout.
- **Usage** – Middleware or route-level check: if flag off, return 404 or 403 for dashboard routes so the feature is “off” when FF is disabled.

- **Socket join** – Enforce FF on every socket join for dashboard room (e.g. org-{orgId}-dashboard): reject join if flag off so subscriptions cannot bypass FF.

**Where the feature flag is maintained (no new DB table):**

| Location | Purpose |
|----------|---------|
| **Config** | `src/config/features.js` – `featureFlags.enabled`, `featureFlags.provider` (`'local'` or `'unleash'`), `featureFlags.url`. Env: `ENABLE_FEATURE_FLAGS`, `FEATURE_FLAG_PROVIDER`, `FEATURE_FLAG_URL`. |
| **Local flags** | `src/services/featureFlagService.js` – object `localFlags`: key = feature name, value = env check (e.g. `process.env.ENABLE_REALTIME_DASHBOARD === 'true'`). Add `'realtime-dashboard': process.env.ENABLE_REALTIME_DASHBOARD === 'true'` here for local gating. |
| **Unleash (optional)** | When `featureFlags.provider === 'unleash'`, flags are maintained in Unleash server; `featureFlagService.isFeatureEnabled('realtime-dashboard', context)` calls Unleash. No code change for the flag name; create the toggle `realtime-dashboard` in Unleash UI. |

There is **no feature-flags DB table** in the current design. Flags are either env-driven (local) or managed in Unleash. If you later want a DB table for flags, a minimal schema could be: `FeatureFlag(name, enabled, createdAt, updatedAt)` with a single row per flag (e.g. `realtime-dashboard`, `true`/`false`). The plan does not require it.

### 4.2 RBAC

- **Reuse** – Same permissions as list views: `sensor.view` and `device.view`; same org rules (user must belong to org or be System Admin).
- **Dashboard API** – Require `sensor.view` and/or `device.view` (depending on whether endpoint returns sensors, devices, or both). Organization from query/path (e.g. `organizationId`). Resolve sensors/devices via existing service layer (e.g. `sensorService.getSensorsByOrganizations`, `deviceService.getDevicesByOrganizations`) so RBAC is consistent.
- **Socket rooms (if org rooms added)** – On **every** `join('org-{orgId}-dashboard')`, server validates (1) feature flag `realtime-dashboard` is enabled, (2) authenticated user has access to that org (same as dashboard API). Validate `orgId` on every connection; reject join if invalid org or unauthorized. If not, ignore join or disconnect. No new permission; reuse org membership.

### 4.3 Dashboard API (initial load)

- **Purpose** – Return current snapshot for dashboard table: sensors and/or devices with latest value (and optionally timestamp).
- **Suggested endpoints** (REST, under a prefix e.g. `/api/dashboard` or under existing `/api` with a resource like `dashboard/telemetry`):
  - Option A: **Single combined** – `GET /api/dashboard/telemetry?organizationId=1` → sensors + devices with current values (single response).
  - Option B: **Split** – `GET /api/dashboard/sensors?organizationId=1`, `GET /api/dashboard/devices?organizationId=1` → allows separate tables or lazy loading.
- **Response shape (conceptual)** – List of entities; each has identity (sensorId/deviceId, names, etc.) plus “current value”:
  - Sensor: e.g. `{ sensorId, sensorName, variableName, value, timestamp }` (one row per telemetry variable, or aggregated per sensor).
  - Device: e.g. `{ deviceId, deviceUuid, stateName, value, timestamp }` (one row per state, or aggregated per device).

**Resulting table (dashboard snapshot):** The API returns an array of rows. Conceptually, the UI table (or combined response) can look like the following. Sensors and devices can be one table or two (split endpoints).

**Sensors (e.g. GET /api/dashboard/sensors?organizationId=1):**

| sensorId | sensorName | variableName | value | timestamp |
|----------|------------|--------------|-------|-----------|
| 101 | Temperature Sensor 1 | temperature | 24.5 | 2025-02-02T10:00:00.000Z |
| 101 | Temperature Sensor 1 | humidity | 65 | 2025-02-02T10:00:00.000Z |
| 102 | Soil Moisture A | moisture | 0.42 | 2025-02-02T09:59:58.000Z |

**Devices (e.g. GET /api/dashboard/devices?organizationId=1):**

| deviceId | deviceUuid | stateName | value | timestamp |
|----------|------------|-----------|-------|-----------|
| 201 | uuid-abc-... | Power | on | 2025-02-02T10:00:00.000Z |
| 201 | uuid-abc-... | Mode | auto | 2025-02-02T09:55:00.000Z |
| 202 | uuid-def-... | Power | off | 2025-02-02T09:50:00.000Z |

Values come from Redis (latest-value cache); timestamps are from the cached payload. Pagination (cursor or limit/offset) applies; the API can return `{ data: { sensors: [...], devices: [...] }, cursor?, hasMore? }` or equivalent.

- **Implementation approach** – To avoid N+1 and stay efficient:
  - **Sensors:** (1) Fetch sensors for org (existing service). (2) Resolve TelemetryData for those sensors. (3) Single query or batched query for “latest DataStream per telemetryDataId” (e.g. raw SQL with DISTINCT ON / window function, or a small service that batches by telemetryDataId). Attach latest value to each telemetry/sensor.
  - **Devices:** (1) Fetch devices for org. (2) Resolve DeviceState for those devices. (3) Single or batched query for “current DeviceStateInstance per deviceStateId” (toTimestamp IS NULL or MAX(fromTimestamp)). Attach latest value to each state/device.
- **Pagination / limits** – For large orgs, support **cursor-based pagination** (or `limit`/`offset`) and **lazy load** so the dashboard can show a window and scale horizontally. Avoid returning thousands of entities in a single snapshot; use a single batched query or pipeline for entity list to avoid N+1.

### 4.4 Real-time updates (sockets)

- **Reuse existing events** – No change to ingestion or rule engine. They keep writing DB and emitting:
  - `new-datastream` to `telemetry-{telemetryDataId}` (and optionally broadcast).
  - `device-state-change` to `device-uuid-{uuid}` and `device-{deviceId}`.
- **Client options**  
  - **Option 1 (minimal server change):** Client subscribes to many rooms: after loading dashboard data, for each sensor variable it joins `telemetry-{telemetryDataId}`; for each device it joins `device-uuid-{uuid}` (or `device-{id}`). On each event, update the corresponding row. Server already emits; no new server event types.  
  - **Option 2 (org-level room):** Server, when it emits `new-datastream` or `device-state-change`, also emits a **small delta payload** to `org-{organizationId}-dashboard` (e.g. `{ type: 'sensor'|'device', id, variableOrState, value, timestamp }` – only changed fields). **Throttle/batch** org-room emits (e.g. group updates every 100ms per org) to avoid event storms when many telemetry updates occur simultaneously. Client joins a single room per org and updates the table.
- **Room membership** – If using org rooms: on socket connection, client sends “join dashboard for org” (e.g. `join('org-1-dashboard')`). Server validates org access (same as RBAC for dashboard API) then allows join. Only then server emits dashboard-specific events to that room.

### 4.5 Scalability and horizontal growth

- **Stateless API** – Dashboard endpoints are stateless; scale by adding more API instances behind a load balancer.
- **Sockets** – Socket.io supports sticky sessions (or adapter). If you scale to multiple nodes, use the **Socket.io Redis adapter** so that emit to a room is broadcast to all nodes and clients in that room receive it. No change to event semantics; only deployment/configuration.
- **DB** – Dashboard snapshot **does not** query DataStream / DeviceStateInstance for "latest" at request time; it reads from Redis (latest-value cache). DB is only used for entity list (sensors/devices for org) and optional cache backfill on miss. So DB load from the dashboard is minimal and bounded. “latest”.
- **Feature flag** – Centralized (e.g. Unleash) so all instances see the same flag state.

### 4.6 Latest-value cache (Redis) – consistency with existing architecture

To avoid hammering the DB at scale and to stay consistent with existing Redis usage (rule chain index, queues, pub/sub), the dashboard uses a **Redis latest-value cache**. Same Redis connection/config as today; no new cache system.

- **Key layout (suggested)**  
  - Sensor (per telemetry variable): `dashboard:telemetry:{telemetryDataId}` → JSON `{ value, recievedAt }` (or similar). TTL optional (e.g. 24h) so stale keys expire.  
  - Device (per device state): `dashboard:device-state:{deviceStateId}` → JSON `{ value, fromTimestamp }`. TTL optional.
- **Write-through and consistency** – Wherever a **new DataStream** row is written (e.g. `dataStreamController`, `dataStreamService`), **after DB write commits** update the Redis key `dashboard:telemetry:{telemetryDataId}` with the new value and timestamp. Wherever a **new DeviceStateInstance** is written (e.g. `deviceStateInstanceService.createInstance`), same for `dashboard:device-state:{deviceStateId}`. **Use latest-timestamp wins:** when writing Redis, compare stored timestamp with new timestamp; do not blindly overwrite (avoids out-of-order writes from concurrent ingestion). DB remains the durable store; Redis is updated in the same flow (write-through).
- **Dashboard API** – Reads current values via MGET (or pipeline) of the Redis keys for the telemetry/device-state IDs the user can see. No "latest DataStream/DeviceStateInstance" query at request time.
- **Cold start / cache miss** – **Lazy per-entity backfill:** if a key is missing (e.g. new entity or Redis eviction), do **not** bulk-fetch from DB for all missing keys (that would hammer the DB). Instead: (1) return placeholder / "no value" for that entity in the snapshot, and optionally (2) trigger a single per-entity DB read and SET in Redis asynchronously so the next request or socket update fills it. Alternatively, show "no value" until the next write backfills Redis.
- **Redis memory and eviction** – Monitor memory for large orgs (thousands of sensors × variables can consume significant RAM). Use TTL (e.g. 24h) so stale keys expire; tune eviction policy if needed. If Redis evicts keys, UX can show missing value until lazy backfill or next write; document this trade-off.

---

## 5. Suggested Implementation Order

For a **gradual task plan** with checkboxes and phases, see [real-time-dashboard-tasks.md](./real-time-dashboard-tasks.md).

1. **Feature flag** – Add `realtime-dashboard` (local + Unleash if used). Gate a stub route so the feature is off when disabled.
2. **RBAC** – Define which permissions the dashboard uses (e.g. `sensor.view`, `device.view`) and how `organizationId` is passed; reuse existing middleware and services.
3. **Latest-value cache (Redis)** – Add write-through: when DataStream is created, SET `dashboard:telemetry:{telemetryDataId}`; when DeviceStateInstance is created, SET `dashboard:device-state:{deviceStateId}`. Use same `redisConnection` as rule chain index/queues.
4. **Dashboard API – sensors** – Snapshot for sensors; **read current values from Redis** (MGET by telemetryDataId); entity list from DB; pagination/limit; behind RBAC + FF. Optional DB fallback on cache miss.
5. **Dashboard API – devices** – Same for devices; **read current values from Redis** (MGET by deviceStateId); entity list from DB; behind RBAC + FF. Optional DB fallback on cache miss.
6. **Client socket usage** – Document which events and rooms the client must subscribe to (per-telemetry and per-device, or org room). If org room is chosen, add server-side emit to `org-{orgId}-dashboard` (with throttle/batch) and join validation (FF + RBAC on every join).
7. **Integration test** – After Redis write-through + dashboard API: verify snapshot API + Redis + RBAC + FF; verify socket events update dashboard; verify FF gating (API and socket join).
8. **Optional: Redis adapter** – When moving to multiple API instances, add Socket.io Redis adapter and sticky sessions so room broadcasts work across nodes. Monitor event propagation latency.

---

## 6. Security and Validation

- **Auth** – Dashboard API and socket join require authenticated user (existing auth middleware).
- **RBAC** – Dashboard API returns only sensors/devices in organizations the user can access. Socket join for `org-{orgId}-dashboard` only if user has access to that org.
- **Feature flag** – Without the flag, dashboard API returns 404/403 and no dashboard room join.
- **Input** – Validate `organizationId` (type, presence); validate pagination params to avoid abuse (max page size, etc.). For socket join: validate `orgId` on every connection; reject join if invalid or unauthorized (malicious clients could attempt join with invalid orgId).

---

## 7. Summary Table

| Area | Approach |
|------|----------|
| **Initial data** | New dashboard API(s): snapshot of sensors/devices with latest value; **current values from Redis (latest-value cache)**; entity list from DB; pagination. No "latest DataStream/DeviceStateInstance" query at request time. |
| **Updates** | Reuse existing socket events (`new-datastream`, `device-state-change`); client subscribes per-entity or per-org room. |
| **Caching** | **Redis latest-value cache** (write-through on DataStream and DeviceStateInstance write). Same Redis as rule chain index/queues; consistent with existing architecture. |
| **RBAC** | Reuse `sensor.view` / `device.view` and org membership; same as list APIs. |
| **Feature flag** | New flag `realtime-dashboard`; gate all dashboard routes and enforce on every socket join for dashboard room. |
| **Scale** | Dashboard does not hammer DB: snapshot reads from Redis. Stateless API; Socket.io Redis adapter when multi-node; optional DB fallback on cache miss only. |

This plan keeps the workflow scalable, efficient, and aligned with your existing sockets and RBAC, and makes the real-time dashboard a feature-flagged, first-class capability without duplicating write paths or breaking horizontal scaling.

---

## 8. Technical review – risks and mitigations (adopted improvements)

This section records risks raised in technical review and how the plan addresses them. **We adopt** the improvements below; **counter-arguments or deferrals** are noted where applicable.

**Legend – "Adopted?" column:**
- **Yes** – We adopt this improvement; the plan or implementation will include the mitigation.
- **Defer for v1** – We do not implement this in the first version. We accept the risk for now and may address it in a later release when we have evidence or scale (e.g. Redis sharding only if a single Redis becomes a bottleneck).
- **Acknowledge** – We acknowledge the risk but do not add a concrete design change or mitigation now. We may monitor or document it; no commitment to implement a specific fix unless needed later.

| Risk / improvement | Adopted? | How the plan addresses it |
|--------------------|----------|----------------------------|
| **MGET heavy for thousands of sensors** | Defer for v1 | Single Redis + MGET pipeline is acceptable for v1. If a single Redis becomes a bottleneck at very large scale, consider sharding keys by org or Redis Cluster (hash slots). |
| **FF bypass via socket join** | Yes | Enforce feature flag check on **every** socket join for dashboard room; reject join if FF off (§4.1, §4.2). |
| **Out-of-order writes / timestamp** | Yes | Write-through Redis **after DB commit**; use **latest-timestamp wins** when setting Redis (compare stored vs new timestamp; do not blindly overwrite) (§4.6). |
| **Event storms (many telemetry updates)** | Yes | **Throttle/batch** org-room emits (e.g. group updates every 100ms per org); send **delta/small payload** only (§4.4). |
| **Cold start / cache miss hammers DB** | Yes | **Lazy per-entity backfill** only; no bulk DB fetch on cache miss. Placeholder or "no value" for missing keys; optional async per-entity backfill (§4.6). |
| **RBAC on every socket join** | Yes | Validate org access (and FF) on **every** `join('org-{orgId}-dashboard')`; validate `orgId` per connection (§4.2, §6). |
| **Large snapshot (thousands of entities)** | Yes | **Cursor-based pagination** and **lazy load**; avoid returning unbounded list (§4.3). |
| **Redis memory / eviction** | Yes | Monitor memory; TTL (e.g. 24h); lazy backfill + placeholder when key missing (§4.6). |
| **Integration test before client sockets** | Yes | Step 7 in implementation order: integration test after Redis + API to verify snapshot, RBAC, FF, and socket updates (§5). |
| **Sticky session / Redis pub/sub latency** | Acknowledge | Monitor latency when using Socket.io Redis adapter; consider batching or lightweight queue for org emits if needed (§4.5, §5). |
