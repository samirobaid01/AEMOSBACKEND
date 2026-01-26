# Prometheus Metrics Reference

**Last Updated**: January 25, 2026  
**Version**: 1.0

---

## 📊 **METRICS OVERVIEW**

AEMOS Backend exposes comprehensive Prometheus metrics for observability of rule engine execution, system performance, and business operations.

**Endpoint**: `GET /api/v1/metrics/prometheus`

**Format**: Prometheus text format (version 0.0.4)

---

## 🎯 **METRIC CATEGORIES**

### **1. Rule Execution Metrics**

#### **`rule_execution_duration_seconds`** (Histogram)
System-wide rule execution duration (NO ruleChainId to prevent cardinality explosion).

**Labels**:
- `status`: `success`, `failure`, `timeout`

**Buckets**: `0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10`

**Example Queries**:
```promql
# P95 execution duration
histogram_quantile(0.95, rate(rule_execution_duration_seconds_bucket[5m]))

# Average execution duration
rate(rule_execution_duration_seconds_sum[5m]) / rate(rule_execution_duration_seconds_count[5m])
```

**Cardinality**: 2 statuses × 10 buckets = 20 series ✅

---

#### **`rule_execution_total`** (Counter)
Total rule chain executions (WITH ruleChainId for per-rule accountability).

**Labels**:
- `ruleChainId`: Rule chain ID (bounded, ~100 values)
- `status`: `success`, `failure`, `timeout`

**Example Queries**:
```promql
# Execution rate per rule chain
rate(rule_execution_total[5m])

# Success rate
rate(rule_execution_total{status="success"}[5m]) / rate(rule_execution_total[5m]) * 100

# Failure rate by rule chain
rate(rule_execution_total{status="failure"}[5m])
```

**Cardinality**: ~100 rule chains × 3 statuses = 300 series ✅

---

#### **`rule_execution_nodes_executed`** (Gauge)
Number of nodes executed per rule chain.

**Labels**:
- `ruleChainId`: Rule chain ID

**Example Queries**:
```promql
# Current nodes executed per chain
rule_execution_nodes_executed

# Average nodes per execution
avg(rule_execution_nodes_executed)
```

**Cardinality**: ~100 rule chains = 100 series ✅

---

#### **`rule_filter_evaluations_total`** (Counter)
Total filter evaluations.

**Labels**:
- `ruleChainId`: Rule chain ID
- `result`: `passed`, `failed`

**Example Queries**:
```promql
# Filter evaluation rate
rate(rule_filter_evaluations_total[5m])

# Filter pass rate
rate(rule_filter_evaluations_total{result="passed"}[5m]) / 
rate(rule_filter_evaluations_total[5m]) * 100
```

**Cardinality**: ~100 rule chains × 2 results = 200 series ✅

---

#### **`rule_action_executions_total`** (Counter)
Total action executions.

**Labels**:
- `ruleChainId`: Rule chain ID
- `actionType`: Action type (e.g., `device_command`)

**Example Queries**:
```promql
# Action execution rate
rate(rule_action_executions_total[5m])

# Actions by type
rate(rule_action_executions_total[5m]) by (actionType)
```

**Cardinality**: ~100 rule chains × 10 action types = 1000 series ✅

---

### **2. Data Collection Metrics**

#### **`data_collection_duration_seconds`** (Histogram)
Duration of sensor/device data collection.

**Labels**:
- `type`: `sensor`, `device`
- `status`: `success`, `timeout`

**Buckets**: `0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1`

**Example Queries**:
```promql
# P95 collection duration
histogram_quantile(0.95, rate(data_collection_duration_seconds_bucket[5m]))

# Average collection time
rate(data_collection_duration_seconds_sum[5m]) / rate(data_collection_duration_seconds_count[5m])
```

**Cardinality**: 2 types × 2 statuses × 7 buckets = 28 series ✅

---

#### **`data_collection_total`** (Counter)
Total data collection attempts.

**Labels**:
- `type`: `sensor`, `device`
- `status`: `success`, `failure`, `timeout`

**Example Queries**:
```promql
# Collection rate
rate(data_collection_total[5m])

# Success rate
rate(data_collection_total{status="success"}[5m]) / rate(data_collection_total[5m]) * 100
```

**Cardinality**: 2 types × 3 statuses = 6 series ✅

---

### **3. HTTP Request Metrics**

#### **`http_request_duration_seconds`** (Histogram)
HTTP request duration.

**Labels**:
- `method`: HTTP method (GET, POST, PUT, DELETE)
- `route`: Normalized route path (e.g., `/api/v1/datastreams`)
- `status_code`: HTTP status code (200, 201, 400, 500, etc.)

**Buckets**: `0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2`

**Example Queries**:
```promql
# P95 request duration
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# P95 by route
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) by (route)

# Average request time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

**Cardinality**: ~20 routes × 4 methods × 5 status codes × 8 buckets = ~3200 series ✅

---

#### **`http_requests_total`** (Counter)
Total HTTP requests.

**Labels**:
- `method`: HTTP method
- `route`: Normalized route path
- `status_code`: HTTP status code

**Example Queries**:
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100

# Requests by route
rate(http_requests_total[5m]) by (route)
```

**Cardinality**: ~20 routes × 4 methods × 5 status codes = ~400 series ✅

---

### **4. Business Metrics**

#### **`telemetry_ingestion_total`** (Counter)
Total telemetry data points ingested.

**Labels**:
- `organizationId`: Organization ID (bounded, ~10-100 values)

**Example Queries**:
```promql
# Ingestion rate
rate(telemetry_ingestion_total[5m])

# Ingestion rate by organization
rate(telemetry_ingestion_total[5m]) by (organizationId)

# Total ingested (last hour)
increase(telemetry_ingestion_total[1h])
```

**Cardinality**: ~10-100 organizations = ~100 series ✅

**⚠️ Cardinality Note**: We use `organizationId` only, NOT `sensorUUID`. For per-sensor metrics, use structured logging.

---

#### **`notifications_sent_total`** (Counter)
Total notifications sent.

**Labels**:
- `protocol`: `mqtt`, `coap`, `socket`

**Example Queries**:
```promql
# Notification rate
rate(notifications_sent_total[5m])

# Notifications by protocol
rate(notifications_sent_total[5m]) by (protocol)

# Total notifications (last hour)
increase(notifications_sent_total[1h])
```

**Cardinality**: 3 protocols = 3 series ✅

---

#### **`device_state_changes_total`** (Counter)
Total device state changes.

**Labels**:
- `organizationId`: Organization ID

**Example Queries**:
```promql
# State change rate
rate(device_state_changes_total[5m])

# State changes by organization
rate(device_state_changes_total[5m]) by (organizationId)
```

**Cardinality**: ~10-100 organizations = ~100 series ✅

---

### **5. Timeout Metrics** (from P1 Issue #2)

#### **`rule_timeout_total`** (Counter)
Total rule execution timeouts.

**Labels**:
- `error_code`: `DATA_COLLECTION_TIMEOUT`, `RULE_CHAIN_TIMEOUT`, `WORKER_TIMEOUT`

**Example Queries**:
```promql
# Timeout rate
rate(rule_timeout_total[5m])

# Timeout rate by error code
rate(rule_timeout_total[5m]) by (error_code)
```

**Cardinality**: 4 error codes = 4 series ✅

---

#### **`rule_timeout_duration_seconds`** (Histogram)
Duration of timed-out operations.

**Labels**:
- `error_code`: Error code

**Example Queries**:
```promql
# Average timeout duration
rate(rule_timeout_duration_seconds_sum[5m]) / rate(rule_timeout_duration_seconds_count[5m])
```

**Cardinality**: 4 error codes × 6 buckets = 24 series ✅

---

### **6. Queue Metrics** (from P0)

#### **`rule_engine_queue_*`** (Gauges/Counters)
Queue depth, worker count, health status, backpressure state.

**See**: Existing queue metrics documentation

---

## 🔴 **CARDINALITY CONTROL**

### **Rules**

| ✅ **ALLOWED** | ❌ **FORBIDDEN** |
|---------------|------------------|
| `ruleChainId` (~100) - **Counters ONLY** | `sensorUUID` (10k+) |
| `organizationId` (~100) | `deviceUUID` (10k+) |
| `status` (2-3) | `userId` (1k+) |
| `type` (2-3) | `telemetryDataId` (millions) |
| `method` (4-5) | `jobId` (unbounded) |
| `route` (~20) | `requestId` (unbounded) |
| `status_code` (5-10) | `sessionId` (unbounded) |
| `protocol` (3-4) | `deviceToken` (unbounded) |

### **Critical Rule: Histograms vs Counters**

**Histograms** (system-wide):
- ❌ **NO** `ruleChainId` (multiplies by bucket count!)
- ✅ **ONLY** bounded enums: `status`, `type`, `method`, `route`, `status_code`

**Counters** (per-rule accountability):
- ✅ **YES** `ruleChainId` (bounded, no multiplication)
- ✅ Use for: execution counts, filter evaluations, actions

**Why**: 100 rule chains × 10 buckets = 1000 series per histogram!

---

## 📈 **EXAMPLE QUERIES**

### **Rule Execution Performance**

```promql
# P95 execution duration (system-wide)
histogram_quantile(0.95, rate(rule_execution_duration_seconds_bucket[5m]))

# Execution rate per rule chain
rate(rule_execution_total[5m]) by (ruleChainId)

# Success rate
sum(rate(rule_execution_total{status="success"}[5m])) / 
sum(rate(rule_execution_total[5m])) * 100

# Top 10 rule chains by execution count
topk(10, sum(rate(rule_execution_total[5m])) by (ruleChainId))
```

### **System Health**

```promql
# Queue utilization
rule_engine_queue_total_pending / rule_engine_backpressure_threshold_critical * 100

# Worker efficiency
rule_engine_queue_active / rule_engine_workers

# HTTP error rate
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / 
sum(rate(http_requests_total[5m])) * 100
```

### **Business Metrics**

```promql
# Telemetry ingestion rate (total)
sum(rate(telemetry_ingestion_total[5m]))

# Telemetry ingestion by organization
rate(telemetry_ingestion_total[5m]) by (organizationId)

# Notification delivery rate
sum(rate(notifications_sent_total[5m])) by (protocol)

# Device state change rate
sum(rate(device_state_changes_total[5m]))
```

---

## 🚨 **ALERTING**

See `prometheus/alerts/aemos-rules.yml` for complete alert definitions.

**Key Alerts**:
- High rule execution failure rate (> 5%)
- Slow rule execution (p95 > 5s)
- Queue depth critical (> 50k pending)
- High HTTP error rate (> 5%)
- Data collection timeouts (> 0.1/sec)
- No active workers

---

## ⚠️ **CARDINALITY WARNINGS**

### **DO NOT**:
- ❌ Add `sensorUUID` or `deviceUUID` to any metric labels
- ❌ Add `ruleChainId` to histogram metrics
- ❌ Add unbounded labels (jobId, requestId, sessionId)

### **DO**:
- ✅ Use `organizationId` for aggregation
- ✅ Use structured logging for per-device metrics
- ✅ Keep histograms system-wide (no ruleChainId)
- ✅ Use counters for per-rule accountability

---

## 🔧 **TROUBLESHOOTING**

### **High Cardinality Detected**

If you see errors like:
```
Metric cardinality violation: ruleChainId exceeds 200 unique values
```

**Solution**:
1. Check if new rule chains are being created dynamically
2. Review label usage in metrics
3. Consider aggregation strategy

### **Missing Metrics**

If metrics don't appear:
1. Check if metrics manager is initialized
2. Verify middleware is registered
3. Check for cardinality validation errors in logs

---

## 📚 **ADDITIONAL RESOURCES**

- **Grafana Dashboard**: `grafana/dashboards/aemos-backend.json`
- **Alert Rules**: `prometheus/alerts/aemos-rules.yml`
- **Implementation**: `src/utils/metricsManager.js`

---

**Total Series**: ~1936 (under 2000 limit) ✅
