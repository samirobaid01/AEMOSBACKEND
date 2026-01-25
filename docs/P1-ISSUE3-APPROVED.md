# P1 Issue #3: Prometheus Metrics - Approved with Expert Review

**Status**: ✅ **APPROVED - READY FOR IMPLEMENTATION**  
**Date**: January 25, 2026  
**Reviewer Feedback**: Expert architectural review incorporated

---

## ✅ **APPROVAL STATUS**

| Decision Point | Status | Notes |
|----------------|--------|-------|
| **Architecture** | ✅ Approved | Manual formatting (consistent) |
| **Cardinality Strategy** | ✅ Approved + Enhanced | Guardrails added |
| **Metrics Design** | ✅ Approved + Adjusted | Histograms without ruleChainId |
| **Storage Approach** | ✅ Approved | In-memory (v1) |
| **Performance** | ✅ Approved | < 1ms overhead realistic |
| **Overall Approach** | ✅ Approved | Production-safe |

---

## 🔧 **CRITICAL ADJUSTMENTS INCORPORATED**

### **Adjustment #1: Histogram Cardinality Fix** ✅

**Problem**: Including `ruleChainId` in histograms multiplies cardinality by bucket count

**Before** (❌ High Cardinality):
```promql
rule_execution_duration_seconds_bucket{ruleChainId="1",status="success",le="0.01"} 5
rule_execution_duration_seconds_bucket{ruleChainId="1",status="success",le="0.05"} 12
# ... 100 rule chains × 10 buckets = 1000 series!
```

**After** (✅ Low Cardinality):
```promql
rule_execution_duration_seconds_bucket{status="success",le="0.01"} 50
rule_execution_duration_seconds_bucket{status="success",le="0.05"} 120
# ... 2 statuses × 10 buckets = 20 series!
```

**Strategy**:
- **Histograms**: System-wide behavior (NO ruleChainId)
- **Counters**: Per-rule accountability (WITH ruleChainId)

**Impact**: Reduces histogram cardinality from 1000+ to 20 series

---

### **Adjustment #2: Cardinality Guardrails** ✅

**Problem**: Future regressions could introduce high-cardinality labels

**Solution**: Runtime validation in metrics manager

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

**Benefits**:
- ✅ Prevents accidental high-cardinality labels
- ✅ Fails fast during development
- ✅ Documents cardinality limits
- ✅ Enforces discipline

---

## 📊 **FINAL METRICS DESIGN**

### **Rule Execution Metrics** (Adjusted)

| Metric | Type | Labels | Cardinality | Purpose |
|--------|------|--------|-------------|---------|
| `rule_execution_duration_seconds` | Histogram | `status` | 20 series | System-wide performance |
| `rule_execution_total` | Counter | `ruleChainId`, `status` | 300 series | Per-rule accountability |
| `rule_execution_nodes_executed` | Gauge | `ruleChainId` | 100 series | Per-rule complexity |
| `rule_filter_evaluations_total` | Counter | `ruleChainId`, `result` | 200 series | Filter performance |
| `rule_action_executions_total` | Counter | `ruleChainId`, `actionType` | 300 series | Action tracking |

**Total Rule Metrics**: ~920 series ✅

### **Data Collection Metrics**

| Metric | Type | Labels | Cardinality | Purpose |
|--------|------|--------|-------------|---------|
| `data_collection_duration_seconds` | Histogram | `type`, `status` | 8 series | Collection performance |
| `data_collection_total` | Counter | `type`, `status` | 4 series | Collection health |

**Total Data Collection**: 12 series ✅

### **HTTP Request Metrics**

| Metric | Type | Labels | Cardinality | Purpose |
|--------|------|--------|-------------|---------|
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | ~400 series | API performance |
| `http_requests_total` | Counter | `method`, `route`, `status_code` | ~400 series | API usage |

**Total HTTP Metrics**: ~800 series ✅

### **Business Metrics**

| Metric | Type | Labels | Cardinality | Purpose |
|--------|------|--------|-------------|---------|
| `telemetry_ingestion_total` | Counter | `organizationId` | ~100 series | Ingestion rate |
| `notifications_sent_total` | Counter | `protocol` | 4 series | Notification delivery |
| `device_state_changes_total` | Counter | `organizationId` | ~100 series | State change rate |

**Total Business Metrics**: ~204 series ✅

**Grand Total**: ~1936 series (under 2000 limit) ✅

---

## 🎯 **KEY DECISIONS FINALIZED**

### **1. Metrics Library** ✅
- **Decision**: Manual Prometheus formatting
- **Rationale**: Consistent, no dependencies, proven approach

### **2. Cardinality Strategy** ✅
- **Decision**: Strict bounded labels + guardrails
- **Enforcement**: Runtime validation prevents regressions

### **3. Histogram Strategy** ✅
- **Decision**: System-wide (no ruleChainId) vs Per-rule (counters with ruleChainId)
- **Rationale**: Prevents bucket multiplication

### **4. Storage Approach** ✅
- **Decision**: In-memory (similar to timeoutMetrics)
- **Rationale**: Simple, fast, sufficient for v1

### **5. Performance Target** ✅
- **Decision**: < 1ms overhead per metric operation
- **Rationale**: Achievable with counters/histograms, no async I/O

---

## 📋 **ACCEPTANCE CRITERIA STATUS**

| # | Criteria | Status |
|---|----------|--------|
| **AC1** | Rule execution metrics | ✅ Ready (adjusted design) |
| **AC2** | System metrics (HTTP, DB, Redis) | ✅ Ready |
| **AC3** | Business metrics | ✅ Ready |
| **AC4** | Cardinality control | ✅ Ready (with guardrails) |
| **AC5** | Grafana dashboard | ✅ Ready |
| **AC6** | Alert rules | ✅ Ready |
| **AC7** | Documentation | ✅ Ready |
| **AC8** | Performance (< 1ms) | ✅ Ready |

**Total**: 8/8 ACs approved ✅

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: Core Infrastructure** (8 hours)
- ✅ Metrics manager with cardinality guardrails
- ✅ Rule execution metrics (histograms + counters)
- ✅ Data collection metrics
- ✅ HTTP metrics middleware
- ✅ Integration with Prometheus endpoint

### **Phase 2: Business Metrics** (8 hours)
- ✅ Telemetry ingestion metrics
- ✅ Notification metrics
- ✅ Device state change metrics
- ✅ Performance testing

### **Phase 3: Dashboards & Docs** (8 hours)
- ✅ Grafana dashboard (15+ panels)
- ✅ Prometheus alert rules (8+ alerts)
- ✅ Comprehensive documentation

**Total**: 24 hours (3 days)

---

## 📁 **FILES TO CREATE/MODIFY**

### **New Files (5)**
1. `src/utils/metricsManager.js` - Centralized metrics + guardrails
2. `src/middleware/metricsMiddleware.js` - HTTP metrics
3. `grafana/dashboards/aemos-backend.json` - Dashboard
4. `prometheus/alerts/aemos-rules.yml` - Alert rules
5. `docs/PROMETHEUS-METRICS.md` - Documentation

### **Modified Files (6)**
6. `src/routes/metricsRoutes.js` - Integrate new metrics
7. `src/services/ruleChainService.js` - Rule execution metrics
8. `src/controllers/dataStreamController.js` - Ingestion metrics
9. `src/app.js` - Register HTTP middleware
10. `src/services/notificationBridgeService.js` - Notification metrics
11. `src/services/deviceStateInstanceService.js` - State change metrics

**Total**: 11 files

---

## ✅ **EXPERT REVIEW FEEDBACK - ALL INCORPORATED**

### **✅ Approved Decisions**
1. ✅ Manual formatting (consistent approach)
2. ✅ Cardinality strategy (strict enforcement)
3. ✅ Metrics scope (appropriate for P1)
4. ✅ Storage approach (in-memory v1)
5. ✅ Performance constraint (< 1ms)

### **✅ Critical Adjustments Applied**
1. ✅ Histograms: NO ruleChainId (prevents bucket multiplication)
2. ✅ Counters: YES ruleChainId (per-rule accountability)
3. ✅ Cardinality guardrails (runtime validation)

### **✅ Strong Recommendations Implemented**
1. ✅ Guardrail validation function
2. ✅ Clear histogram vs counter strategy
3. ✅ Cardinality limits documented and enforced

---

## 🎯 **BUSINESS VALUE**

After implementation, you can:
- ✅ Answer "Are rules slow or broken?"
- ✅ Prove SLA compliance
- ✅ Alert before incidents
- ✅ Justify scaling decisions with data
- ✅ Safely onboard more customers

**This is observability that supports growth, not just debugging.**

---

## 🏁 **READY TO IMPLEMENT**

**Status**: All architectural decisions finalized  
**Risk Level**: Low (with guardrails)  
**Confidence Level**: High  

**Proceeding with Phase 1 implementation now!** 🚀

---

*This approval incorporates expert architectural review feedback to ensure production-safe, cardinality-controlled metrics implementation.*
