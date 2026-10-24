# Real-Time Dashboard – Task Plan

Gradual implementation plan for the real-time sensor/device dashboard. Each phase can be done in one or more PRs. Reference: [real-time-dashboard-architecture.md](./real-time-dashboard-architecture.md).

---

## Phase 1: Feature flag and RBAC wiring

| # | Task | Details | Done |
|---|------|---------|------|
| 1.1 | **Feature flag – local** | Ensure `realtime-dashboard` exists in `featureFlagService.js` localFlags (already added). Add `ENABLE_REALTIME_DASHBOARD` to env example / README if needed. | ☐ |
| 1.2 | **Feature flag – middleware** | Create middleware (e.g. `requireFeature('realtime-dashboard')`) that calls `featureFlagService.isFeatureEnabled('realtime-dashboard', context)`; on false return 404 or 403. | ☐ |
| 1.3 | **Stub dashboard route** | Add a stub route under `/api/dashboard` (e.g. `GET /api/dashboard/telemetry` or `/api/dashboard/health`) protected by auth + FF middleware. Returns minimal JSON when FF on. | ☐ |
| 1.4 | **RBAC for dashboard** | Document and apply: dashboard routes require `sensor.view` and/or `device.view`; `organizationId` from query. Reuse `checkPermission` and org resolution (e.g. from `sensorController`/`deviceController`). | ☐ |

**Exit criteria:** With FF off, dashboard route returns 403/404. With FF on and valid auth + org, stub returns 200.

---

## Phase 2: Redis latest-value cache (write-through)

| # | Task | Details | Done |
|---|------|---------|------|
| 2.1 | **Cache key and TTL constants** | Define in a small module or config: key prefixes `dashboard:telemetry:`, `dashboard:device-state:`, optional TTL (e.g. 86400). Use same `redisConnection` as rest of app. | ☐ |
| 2.2 | **Write-through – DataStream** | After every **successful** DataStream create (e.g. in `dataStreamController` or `dataStreamService`), SET Redis key `dashboard:telemetry:{telemetryDataId}` with JSON `{ value, recievedAt }`. Use **latest-timestamp wins**: read existing value from Redis, compare `recievedAt`, only SET if new timestamp is newer (or key missing). | ☐ |
| 2.3 | **Write-through – DeviceStateInstance** | After every **successful** DeviceStateInstance create (e.g. in `deviceStateInstanceService.createInstance`), SET Redis key `dashboard:device-state:{deviceStateId}` with JSON `{ value, fromTimestamp }`. Use latest-timestamp wins. | ☐ |
| 2.4 | **Optional: cache service helper** | Optional small helper (e.g. `dashboardCache.setTelemetryLatest(telemetryDataId, value, recievedAt)` and `setDeviceStateLatest(deviceStateId, value, fromTimestamp)`) to centralize key layout and timestamp comparison. | ☐ |

**Exit criteria:** Creating a DataStream or DeviceStateInstance updates the corresponding Redis key; overwrite only when new timestamp is newer.

---

## Phase 3: Dashboard API – sensors snapshot

| # | Task | Details | Done |
|---|------|---------|------|
| 3.1 | **Sensors list for org** | Reuse existing service to get sensors for org (e.g. `sensorService.getSensorsByOrganizations([organizationId])`). Resolve TelemetryData for those sensors (single or batched query). | ☐ |
| 3.2 | **MGET current values from Redis** | For each telemetryDataId, build key `dashboard:telemetry:{telemetryDataId}`. Use Redis MGET (or pipeline) to fetch all current values in one round-trip. Parse JSON; attach value + timestamp to each telemetry/sensor row. | ☐ |
| 3.3 | **Cache miss handling** | For missing keys: return placeholder (e.g. `value: null`, `timestamp: null`) in snapshot. Optional: trigger async per-entity DB read and SET in Redis for next time (lazy backfill). No bulk DB query for "latest" at request time. | ☐ |
| 3.4 | **Endpoint and response shape** | Implement `GET /api/dashboard/sensors?organizationId=1` (or combined telemetry). Response: `{ data: { sensors: [ { sensorId, sensorName, variableName, value, timestamp }, ... ] }, cursor?, hasMore? }`. Apply auth + FF + RBAC (sensor.view, org access). | ☐ |
| 3.5 | **Pagination** | Add cursor-based pagination (or limit/offset) for large orgs. Document max page size and default. | ☐ |

**Exit criteria:** GET dashboard/sensors returns list of sensors with current values from Redis; no DB query for "latest DataStream"; RBAC and FF enforced.

---

## Phase 4: Dashboard API – devices snapshot

| # | Task | Details | Done |
|---|------|---------|------|
| 4.1 | **Devices list for org** | Reuse existing service to get devices for org. Resolve DeviceState for those devices. | ☐ |
| 4.2 | **MGET device state from Redis** | For each deviceStateId, key `dashboard:device-state:{deviceStateId}`. MGET; parse JSON; attach value + timestamp to each state/device row. | ☐ |
| 4.3 | **Cache miss handling** | Same as sensors: placeholder for missing keys; optional lazy per-entity backfill. | ☐ |
| 4.4 | **Endpoint and response shape** | Implement `GET /api/dashboard/devices?organizationId=1`. Response: `{ data: { devices: [ { deviceId, deviceUuid, stateName, value, timestamp }, ... ] }, cursor?, hasMore? }`. Auth + FF + RBAC (device.view, org access). | ☐ |
| 4.5 | **Pagination** | Same as sensors: cursor or limit/offset. | ☐ |

**Exit criteria:** GET dashboard/devices returns list of devices with current state values from Redis; RBAC and FF enforced.

---

## Phase 5: Integration tests

| # | Task | Details | Done |
|---|------|---------|------|
| 5.1 | **Test: FF gating** | Test that dashboard endpoints return 403/404 when FF is disabled; return 200 (with valid auth + org) when FF enabled. | ☐ |
| 5.2 | **Test: RBAC** | Test that dashboard returns only sensors/devices for orgs the user can access; 403 for org user cannot access. | ☐ |
| 5.3 | **Test: Redis write-through** | Test that creating a DataStream (or DeviceStateInstance) updates the expected Redis key; snapshot API returns that value. | ☐ |
| 5.4 | **Test: Cache miss** | Test that when a key is missing, snapshot returns placeholder (e.g. null value) and does not perform bulk DB "latest" query. | ☐ |

**Exit criteria:** Integration tests pass for FF, RBAC, Redis write-through, and cache-miss behavior.

---

## Phase 6: Socket – org room and join validation

| # | Task | Details | Done |
|---|------|---------|------|
| 6.1 | **Socket join handler** | On client `join('org-{orgId}-dashboard')`, server handler: (1) Check FF `realtime-dashboard`; if off, reject join. (2) Validate user has access to org (same as RBAC); validate `orgId` format. If invalid/unauthorized, reject join. | ☐ |
| 6.2 | **Emit to org room on DataStream** | When emitting `new-datastream`, also emit a small delta payload to `org-{organizationId}-dashboard` (resolve org from telemetry/sensor). Payload e.g. `{ type: 'sensor', id, variableOrState, value, timestamp }`. | ☐ |
| 6.3 | **Emit to org room on DeviceStateInstance** | When emitting `device-state-change`, also emit to `org-{organizationId}-dashboard` with small delta payload. | ☐ |
| 6.4 | **Throttle/batch org-room emits** | Implement throttle (e.g. buffer updates per org, flush every 100ms) so high-frequency telemetry does not cause event storms. | ☐ |
| 6.5 | **Document client contract** | Document: which event names to listen for, payload shape, how to join org dashboard room, and that client must pass auth so server can validate join. | ☐ |

**Exit criteria:** Client can join `org-{orgId}-dashboard` only when FF on and user has org access; server emits dashboard deltas to that room with throttling.

---

## Phase 7: Optional – multi-node and polish

| # | Task | Details | Done |
|---|------|---------|------|
| 7.1 | **Socket.io Redis adapter** | When scaling to multiple API instances, add Socket.io Redis adapter so room broadcasts work across nodes. Document sticky sessions if required. | ☐ |
| 7.2 | **Redis memory / TTL** | Confirm TTL (e.g. 24h) on dashboard cache keys; document eviction and lazy-backfill behavior. Add optional metrics for cache hit/miss if useful. | ☐ |
| 7.3 | **Input validation** | Validate `organizationId` (type, presence) and pagination params (max page size) on dashboard endpoints and socket join. | ☐ |

**Exit criteria:** Ready for horizontal scaling; validation and TTL documented and applied.

---

## Dependency overview

```
Phase 1 (FF + RBAC + stub)  →  Phase 3 (sensors API)  →  Phase 5 (integration tests)
         ↓                              ↓
Phase 2 (Redis write-through)  →  Phase 4 (devices API)  →  Phase 6 (socket org room)
         ↓                              ↓
Phase 7 (optional: Redis adapter, TTL, validation)
```

**Suggested order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 (with 3 and 4 parallelizable after 2).

---

## Checklist summary

| Phase | Tasks | Done |
|-------|-------|------|
| 1. Feature flag and RBAC | 4 | 0/4 |
| 2. Redis write-through | 4 | 0/4 |
| 3. Dashboard API – sensors | 5 | 0/5 |
| 4. Dashboard API – devices | 5 | 0/5 |
| 5. Integration tests | 4 | 0/4 |
| 6. Socket org room | 5 | 0/5 |
| 7. Optional | 3 | 0/3 |

Mark tasks with ☐ → ☑ (or replace with `[x]`) as you complete them.
