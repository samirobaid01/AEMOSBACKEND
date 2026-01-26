# P1 Issue #3: Complete Prometheus Metrics Integration

**Status**: 📋 **PLAN - AWAITING APPROVAL**  
**Date**: January 25, 2026  
**Effort**: 3 days  
**Priority**: 🟠 P1

---

## 🎯 **EXECUTIVE SUMMARY**

Complete Prometheus metrics integration for full observability of the AEMOS Backend rule engine, system performance, and business metrics. This builds on existing queue and timeout metrics (P0/P1) to provide comprehensive monitoring.

**Key Deliverables**:
- ✅ Rule execution metrics (duration, success/failure, node counts)
- ✅ Data collection metrics (sensor/device query times)
- ✅ HTTP request metrics (endpoint latency)
- ✅ Business metrics (telemetry ingestion, notifications)
- ✅ Grafana dashboard JSON
- ✅ Prometheus alert rules
- ✅ Comprehensive documentation

**Critical Constraint**: Cardinality control - avoid high-cardinality labels (sensorUUID, deviceUUID) to prevent Prometheus overload.

---

## 📋 **ACCEPTANCE CRITERIA**

| # | Criteria | Status |
|---|----------|--------|
| **AC1** | All rule execution metrics exposed in Prometheus format | ⏳ Pending |
| **AC2** | System metrics (HTTP, DB, Redis) tracked | ⏳ Pending |
| **AC3** | Business metrics for monitoring SLAs | ⏳ Pending |
| **AC4** | Cardinality control - avoid high-cardinality labels | ⏳ Pending |
| **AC5** | Grafana dashboard JSON provided | ⏳ Pending |
| **AC6** | Alert rules defined for critical metrics | ⏳ Pending |
| **AC7** | Documentation with example queries and cardinality warnings | ⏳ Pending |
| **AC8** | Metrics don't impact performance (< 1ms overhead) | ⏳ Pending |

**Total**: 8/8 ACs defined

---

## 🔍 **CURRENT STATE ANALYSIS**

### **What Exists (P0/P1)**
✅ **Queue Metrics** (from P0):
- `rule_engine_queue_waiting`, `rule_engine_queue_active`
- `rule_engine_queue_completed`, `rule_engine_queue_failed`
- `rule_engine_queue_delayed`, `rule_engine_workers`
- `rule_engine_queue_health`
- `rule_engine_backpressure_circuit_state`
- `rule_engine_backpressure_rejected_total`

✅ **Timeout Metrics** (from P1 Issue #2):
- `rule_timeout_total{error_code}`
- `rule_timeout_duration_seconds{error_code}`

✅ **Prometheus Endpoint**: `/api/v1/metrics/prometheus`
✅ **Format**: Manual string formatting (no prom-client dependency)

### **What's Missing (P1 Scope)**

1. **Rule Execution Metrics**
   - Execution duration (histogram)
   - Success/failure counts
   - Nodes executed per chain
   - Filter pass/fail rates
   - Action execution counts

2. **Data Collection Metrics**
   - Sensor data collection duration
   - Device data collection duration
   - Collection success/failure rates

3. **HTTP Request Metrics**
   - Request duration by route
   - Request count by method/route/status
   - Error rate by endpoint

4. **Business Metrics**
   - Telemetry ingestion rate (by organization)
   - Notifications sent (by protocol: MQTT, CoAP, Socket.IO)
   - Device state changes
   - Rule chains triggered per hour

---

## 🏗️ **ARCHITECTURE DECISION**

### **Approach: Manual Prometheus Formatting** ✅

**Decision**: Continue with manual string formatting (consistent with current implementation)

**Rationale**:
- ✅ No new dependencies (prom-client not installed)
- ✅ Consistent with existing timeout metrics implementation
- ✅ Simpler, lighter-weight solution
- ✅ Already proven to work in production
- ✅ Full control over metric format

**Alternative Considered**: prom-client library
- ❌ Requires new dependency
- ❌ Different approach from current codebase
- ❌ More complex setup
- ✅ More features (default Node.js metrics, etc.)

**Verdict**: Manual formatting for consistency and simplicity.

---

## 📊 **METRICS DESIGN (Cardinality-Safe)**

### **Rule Execution Metrics** (✅ Adjusted per Expert Review)

```promql
# Histogram: Rule execution duration (SYSTEM-WIDE, no ruleChainId)
rule_execution_duration_seconds_bucket{status="success",le="0.01"} 50
rule_execution_duration_seconds_bucket{status="success",le="0.05"} 120
rule_execution_duration_seconds_bucket{status="success",le="0.1"} 250
rule_execution_duration_seconds_bucket{status="success",le="0.5"} 450
rule_execution_duration_seconds_bucket{status="success",le="1"} 500
rule_execution_duration_seconds_bucket{status="success",le="2"} 520
rule_execution_duration_seconds_bucket{status="success",le="5"} 530
rule_execution_duration_seconds_bucket{status="success",le="10"} 530
rule_execution_duration_seconds_bucket{status="success",le="+Inf"} 530
rule_execution_duration_seconds_sum{status="success"} 25.0
rule_execution_duration_seconds_count{status="success"} 530

# Counter: Total rule executions (PER-RULE accountability)
rule_execution_total{ruleChainId="1",status="success"} 150
rule_execution_total{ruleChainId="1",status="failure"} 5
rule_execution_total{ruleChainId="1",status="timeout"} 2
rule_execution_total{ruleChainId="2",status="success"} 200

# Gauge: Nodes executed per chain (PER-RULE)
rule_execution_nodes_executed{ruleChainId="1"} 3

# Counter: Filter evaluations (PER-RULE)
rule_filter_evaluations_total{ruleChainId="1",result="passed"} 120
rule_filter_evaluations_total{ruleChainId="1",result="failed"} 30

# Counter: Actions executed (PER-RULE)
rule_action_executions_total{ruleChainId="1",actionType="device_command"} 50
```

**Cardinality**:
- Histograms: 2 statuses × 10 buckets = 20 series ✅ (system-wide)
- Counters: ~100 rule chains × 3 statuses = 300 series ✅ (per-rule)
- **Total**: ~320 series (vs 1000+ with ruleChainId in histograms) ✅

### **Data Collection Metrics**

```promql
# Histogram: Data collection duration
data_collection_duration_seconds_bucket{type="sensor",status="success",le="0.001"} 10
data_collection_duration_seconds_bucket{type="sensor",status="success",le="0.005"} 45
data_collection_duration_seconds_bucket{type="sensor",status="success",le="0.01"} 80
data_collection_duration_seconds_bucket{type="sensor",status="success",le="0.05"} 95
data_collection_duration_seconds_bucket{type="sensor",status="success",le="0.1"} 98
data_collection_duration_seconds_bucket{type="sensor",status="success",le="0.5"} 100
data_collection_duration_seconds_bucket{type="sensor",status="success",le="1"} 100
data_collection_duration_seconds_bucket{type="sensor",status="success",le="+Inf"} 100
data_collection_duration_seconds_sum{type="sensor",status="success"} 0.8
data_collection_duration_seconds_count{type="sensor",status="success"} 100

# Counter: Data collection attempts
data_collection_total{type="sensor",status="success"} 950
data_collection_total{type="sensor",status="failure"} 10
data_collection_total{type="device",status="success"} 800
data_collection_total{type="device",status="failure"} 5
```

**Cardinality**: 2 types × 2 statuses = 4 series ✅

### **HTTP Request Metrics**

```promql
# Histogram: HTTP request duration
http_request_duration_seconds_bucket{method="GET",route="/api/v1/datastreams",status_code="200",le="0.001"} 5
http_request_duration_seconds_bucket{method="GET",route="/api/v1/datastreams",status_code="200",le="0.005"} 20
http_request_duration_seconds_bucket{method="GET",route="/api/v1/datastreams",status_code="200",le="0.01"} 45
http_request_duration_seconds_bucket{method="GET",route="/api/v1/datastreams",status_code="200",le="0.05"} 80
http_request_duration_seconds_bucket{method="GET",route="/api/v1/datastreams",status_code="200",le="0.1"} 95
http_request_duration_seconds_bucket{method="GET",route="/api/v1/datastreams",status_code="200",le="0.5"} 100
http_request_duration_seconds_bucket{method="GET",route="/api/v1/datastreams",status_code="200",le="1"} 100
http_request_duration_seconds_bucket{method="GET",route="/api/v1/datastreams",status_code="200",le="2"} 100
http_request_duration_seconds_bucket{method="GET",route="/api/v1/datastreams",status_code="200",le="+Inf"} 100
http_request_duration_seconds_sum{method="GET",route="/api/v1/datastreams",status_code="200"} 2.5
http_request_duration_seconds_count{method="GET",route="/api/v1/datastreams",status_code="200"} 100

# Counter: HTTP requests
http_requests_total{method="GET",route="/api/v1/datastreams",status_code="200"} 1000
http_requests_total{method="POST",route="/api/v1/datastreams",status_code="201"} 500
http_requests_total{method="POST",route="/api/v1/datastreams",status_code="400"} 10
```

**Cardinality**: ~20 routes × 4 methods × 5 status codes = 400 series max ✅

### **Business Metrics**

```promql
# Counter: Telemetry ingestion (by organization)
telemetry_ingestion_total{organizationId="1"} 50000
telemetry_ingestion_total{organizationId="2"} 30000

# Counter: Notifications sent (by protocol)
notifications_sent_total{protocol="mqtt"} 1000
notifications_sent_total{protocol="coap"} 500
notifications_sent_total{protocol="socket"} 2000

# Counter: Device state changes
device_state_changes_total{organizationId="1"} 150
device_state_changes_total{organizationId="2"} 80

# Gauge: Rule chains triggered (per hour)
rule_chains_triggered_total{organizationId="1"} 500
```

**Cardinality**: ~10-100 organizations = 100-1000 series max ✅

---

## 🔴 **CRITICAL: CARDINALITY CONTROL**

### **Rules**

| ✅ **ALLOWED** | ❌ **FORBIDDEN** |
|---------------|------------------|
| `ruleChainId` (~100 values) - **Counters ONLY** | `sensorUUID` (10k+ values) |
| `organizationId` (~10-100 values) | `deviceUUID` (10k+ values) |
| `status` (2-3 values) | `userId` (1k+ values) |
| `type` (2-3 values) | `telemetryDataId` (millions) |
| `method` (4-5 values) | `jobId` (unbounded) |
| `route` (~20 values) | `requestId` (unbounded) |
| `status_code` (5-10 values) | `sessionId` (unbounded) |
| `protocol` (3-4 values) | `deviceToken` (unbounded) |

### **⚠️ CRITICAL RULE: Histograms vs Counters**

**Histograms** (system-wide behavior):
- ❌ **NO** `ruleChainId` label (multiplies by bucket count!)
- ✅ **ONLY** `status`, `type`, `method`, `route`, `status_code`

**Counters** (per-rule accountability):
- ✅ **YES** `ruleChainId` label (bounded, no multiplication)
- ✅ Use for: execution counts, filter evaluations, actions

**Why**: 100 rule chains × 10 buckets = 1000 series per histogram metric!

### **Why This Matters**

**High Cardinality Example** (❌ DON'T DO THIS):
```javascript
// 10k sensors × 100 rule chains = 1,000,000 time series!
rule_execution_total{sensorUUID="abc123",ruleChainId="1"} 10
rule_execution_total{sensorUUID="abc123",ruleChainId="2"} 5
// ... 999,998 more series
```

**Impact**:
- Prometheus memory: 10GB+ (vs 100MB)
- Query timeouts: 30s+ (vs <100ms)
- Dashboard loading: 30s+ (vs <1s)
- Hits Prometheus limit: 10M series default

**Low Cardinality Example** (✅ DO THIS):
```javascript
// 100 rule chains × 2 statuses = 200 time series
rule_execution_total{ruleChainId="1",status="success"} 150
rule_execution_total{ruleChainId="1",status="failure"} 5
// ... 198 more series (bounded!)
```

**For Per-Device Metrics**: Use structured logging instead
```javascript
logger.info('telemetry_ingested', {
  sensorUUID: 'abc123',
  organizationId: 1,
  variableName: 'temperature',
  value: 25.5
});
```

---

## 🛠️ **TECHNICAL APPROACH**

### **Architecture: Centralized Metrics Manager**

```
src/utils/metricsManager.js (NEW)
  ├─→ Rule Execution Metrics
  ├─→ Data Collection Metrics
  ├─→ HTTP Request Metrics
  ├─→ Business Metrics
  └─→ getPrometheusMetrics() → Formatted string
```

**Integration Points**:
1. `ruleChainService.js` → Record rule execution metrics
2. `dataStreamController.js` → Record telemetry ingestion
3. `app.js` (middleware) → Record HTTP metrics
4. `notificationBridgeService.js` → Record notification metrics
5. `metricsRoutes.js` → Aggregate and expose all metrics

---

## 📦 **IMPLEMENTATION PLAN**

### **Phase 1: Core Metrics Infrastructure** (Day 1 - 8 hours)

#### **1.1 Create Metrics Manager** (`src/utils/metricsManager.js`)
- Centralized metrics storage (in-memory, similar to `timeoutMetrics`)
- Histogram buckets for duration metrics
- Counter tracking for event counts
- Gauge tracking for current values
- **Cardinality guardrails** (validation on metric creation)
- `getPrometheusMetrics()` method for formatting

**Cardinality Validation**:
```javascript
const MAX_LABEL_CARDINALITY = {
  ruleChainId: 200,
  organizationId: 100,
  status: 5,
  type: 5,
  method: 10,
  route: 50,
  status_code: 20,
  protocol: 5
};

function validateLabelCardinality(labelName, labelValue) {
  const max = MAX_LABEL_CARDINALITY[labelName];
  if (max && getUniqueLabelValues(labelName).size > max) {
    throw new Error(`Metric cardinality violation: ${labelName} exceeds ${max} unique values`);
  }
}
```

#### **1.2 Rule Execution Metrics**
- Instrument `ruleChainService.execute()`
- Track: duration, status, nodes executed
- Instrument `ruleChainService.trigger()`
- Track: filter evaluations, action executions

#### **1.3 Data Collection Metrics**
- Instrument `_collectSensorData()`
- Instrument `_collectDeviceData()`
- Track: duration, success/failure

#### **1.4 HTTP Metrics Middleware**
- Create `src/middleware/metricsMiddleware.js`
- Track: method, route, status_code, duration
- Register in `src/app.js`

#### **1.5 Integration**
- Update `metricsRoutes.js` to include new metrics
- Test Prometheus endpoint

---

### **Phase 2: Business Metrics & Integration** (Day 2 - 8 hours)

#### **2.1 Telemetry Ingestion Metrics**
- Instrument `dataStreamController.js`
- Track: ingestion rate by organization
- Avoid sensorUUID in labels (use organizationId only)

#### **2.2 Notification Metrics**
- Instrument `notificationBridgeService.js`
- Track: notifications sent by protocol (MQTT, CoAP, Socket.IO)
- Track: notification failures

#### **2.3 Device State Metrics**
- Instrument `deviceStateInstanceService.js`
- Track: state changes by organization

#### **2.4 Performance Testing**
- Load test to verify < 1ms overhead
- Memory leak testing
- Cardinality verification

---

### **Phase 3: Dashboards & Documentation** (Day 3 - 8 hours)

#### **3.1 Grafana Dashboard**
- Create `grafana/dashboards/aemos-backend.json`
- Panels: Rule execution rate, duration (p50/p95/p99), success rate
- Panels: Queue depth, worker utilization
- Panels: HTTP request latency, error rates
- Panels: Telemetry ingestion rate
- Panels: Notification delivery rates

#### **3.2 Prometheus Alert Rules**
- Create `prometheus/alerts/aemos-rules.yml`
- Alerts: High rule execution failure rate
- Alerts: Slow rule execution (p95 > threshold)
- Alerts: Queue depth critical
- Alerts: High HTTP error rate
- Alerts: Data collection timeouts

#### **3.3 Documentation**
- Create `docs/PROMETHEUS-METRICS.md`
- Metric reference (all metrics documented)
- Example PromQL queries
- Cardinality warnings and best practices
- Grafana dashboard setup guide
- Alert configuration guide

---

## 📁 **FILES TO CREATE/MODIFY**

### **New Files (5)**
1. `src/utils/metricsManager.js` - Centralized metrics manager
2. `src/middleware/metricsMiddleware.js` - HTTP metrics middleware
3. `grafana/dashboards/aemos-backend.json` - Grafana dashboard
4. `prometheus/alerts/aemos-rules.yml` - Alert rules
5. `docs/PROMETHEUS-METRICS.md` - Comprehensive documentation

### **Modified Files (6)**
6. `src/routes/metricsRoutes.js` - Integrate new metrics
7. `src/services/ruleChainService.js` - Add rule execution metrics
8. `src/controllers/dataStreamController.js` - Add ingestion metrics
9. `src/app.js` - Register HTTP metrics middleware
10. `src/services/notificationBridgeService.js` - Add notification metrics
11. `src/services/deviceStateInstanceService.js` - Add state change metrics

**Total**: 11 files

---

## 🧪 **TESTING STRATEGY**

### **Unit Tests** (15+ tests)
- Metrics manager: counter, histogram, gauge operations
- Prometheus format generation
- Cardinality validation
- Performance overhead (< 1ms)

### **Integration Tests** (10+ tests)
- End-to-end metrics collection
- HTTP middleware integration
- Rule execution metrics flow
- Business metrics tracking

### **Performance Tests** (5+ tests)
- Metrics overhead measurement
- Memory leak detection
- High-throughput scenarios
- Cardinality limits verification

**Total**: 30+ tests

---

## 📊 **SUCCESS METRICS**

### **Coverage**
- ✅ 20+ custom metrics defined
- ✅ All critical paths instrumented
- ✅ Grafana dashboard with 15+ panels
- ✅ 8+ alert rules defined

### **Performance**
- ✅ Metrics overhead < 1ms per request
- ✅ Prometheus scrape time < 200ms
- ✅ No memory leaks from metrics
- ✅ Cardinality < 2000 total series

### **Observability**
- ✅ Rule execution visibility (rate, duration, success)
- ✅ System health visibility (HTTP, queue, workers)
- ✅ Business metrics visibility (ingestion, notifications)
- ✅ Alert coverage for critical issues

---

## ⚠️ **RISKS & MITIGATION**

| Risk | Impact | Mitigation |
|------|--------|------------|
| High cardinality from labels | 🔴 Critical | Strict label rules, validation, documentation |
| Performance overhead | 🟠 High | Performance testing, optimization, lazy evaluation |
| Memory leaks | 🟠 High | Bounded storage, cleanup, monitoring |
| Metric explosion | 🟠 High | Cardinality limits, validation, alerts |
| Missing critical metrics | 🟡 Medium | Comprehensive review, stakeholder input |

---

## 🚀 **DEPLOYMENT PLAN**

### **Pre-Deployment**
1. ✅ All tests passing
2. ✅ Performance verified (< 1ms overhead)
3. ✅ Cardinality validated (< 2000 series)
4. ✅ Documentation complete
5. ✅ Grafana dashboard tested

### **Deployment**
1. Deploy code changes
2. Verify Prometheus scraping
3. Import Grafana dashboard
4. Configure alert rules
5. Monitor for 24 hours

### **Rollback Plan**
- Feature flag: `ENABLE_METRICS=false` (disable all metrics)
- Metrics are non-critical (observability only)
- No data loss risk

---

## 🎯 **KEY DECISION POINTS**

### **1. Metrics Library**
**Decision**: Manual formatting (consistent with current approach)  
**Rationale**: No new dependencies, proven approach, full control

### **2. Cardinality Strategy**
**Decision**: Strict bounded labels only  
**Rationale**: Prevent Prometheus overload, production safety

### **3. Storage Approach**
**Decision**: In-memory (similar to timeoutMetrics)  
**Rationale**: Simple, fast, sufficient for v1

### **4. HTTP Middleware Placement**
**Decision**: Early in middleware chain (after body parsing)  
**Rationale**: Capture all requests, minimal overhead

---

## 📋 **ACCEPTANCE CRITERIA DETAILS**

### **AC1: Rule Execution Metrics** (✅ Adjusted)
- Histogram: `rule_execution_duration_seconds{status}` - **NO ruleChainId** (system-wide)
- Counter: `rule_execution_total{ruleChainId, status}` - **WITH ruleChainId** (per-rule)
- Gauge: `rule_execution_nodes_executed{ruleChainId}` - **WITH ruleChainId** (per-rule)
- Counter: `rule_filter_evaluations_total{ruleChainId, result}` - **WITH ruleChainId** (per-rule)
- Counter: `rule_action_executions_total{ruleChainId, actionType}` - **WITH ruleChainId** (per-rule)

### **AC2: System Metrics**
- Histogram: `http_request_duration_seconds{method, route, status_code}`
- Counter: `http_requests_total{method, route, status_code}`
- Histogram: `data_collection_duration_seconds{type, status}`
- Counter: `data_collection_total{type, status}`

### **AC3: Business Metrics**
- Counter: `telemetry_ingestion_total{organizationId}`
- Counter: `notifications_sent_total{protocol}`
- Counter: `device_state_changes_total{organizationId}`

### **AC4: Cardinality Control** (✅ Enhanced)
- No sensorUUID/deviceUUID in labels
- **Histograms: NO ruleChainId** (prevents bucket multiplication)
- **Counters: YES ruleChainId** (bounded, no multiplication)
- All labels bounded (< 200 values each)
- Total series < 2000
- **Cardinality validation guardrails** in metrics manager
- Runtime checks to prevent regressions

### **AC5: Grafana Dashboard**
- 15+ panels covering all metric categories
- Pre-configured queries
- Ready to import

### **AC6: Alert Rules**
- 8+ critical alerts defined
- Prometheus-compatible format
- Thresholds documented

### **AC7: Documentation**
- Complete metric reference
- Example PromQL queries
- Cardinality warnings
- Setup guides

### **AC8: Performance**
- Overhead < 1ms per metric operation
- Verified via load testing
- No memory leaks

---

## ✅ **EXPERT REVIEW INCORPORATED**

### **Critical Adjustments Applied**

#### **1. Histogram Cardinality Fix** ✅
- **Before**: `rule_execution_duration_seconds{ruleChainId, status}` → 1000+ series
- **After**: `rule_execution_duration_seconds{status}` → 20 series
- **Rationale**: Histograms multiply by bucket count (100 chains × 10 buckets = 1000)

#### **2. Cardinality Guardrails** ✅
- Added validation: `validateLabelCardinality()` function
- Runtime checks prevent regressions
- Throws error if cardinality exceeds limits

#### **3. Metrics Strategy Clarified** ✅
- **Histograms**: System-wide behavior (no ruleChainId)
- **Counters**: Per-rule accountability (with ruleChainId)
- Clear separation of concerns

---

## 🏁 **APPROVED & READY FOR IMPLEMENTATION**

**Estimated Effort**: 3 days (24 hours)
- Phase 1: Core Infrastructure (8h)
- Phase 2: Business Metrics (8h)
- Phase 3: Dashboards & Docs (8h)

**Risks**: Low (with cardinality guardrails)

**Impact**: High (full observability)

---

## ✅ **APPROVED DECISIONS**

1. ✅ **Architecture approach** - Manual formatting (consistent)
2. ✅ **Metrics design** - Cardinality-safe (histograms without ruleChainId)
3. ✅ **Cardinality guardrails** - Runtime validation added
4. ✅ **Implementation plan** - 3 phases, 3 days
5. ✅ **Testing strategy** - 30+ tests
6. ✅ **Overall approach** - Production-safe

---

## 🚀 **PROCEEDING WITH IMPLEMENTATION**

All expert review adjustments incorporated. Starting Phase 1 now!
