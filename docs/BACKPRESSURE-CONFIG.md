# Backpressure Configuration Guide

## Environment Variables

Add these to your `.env` file to configure backpressure handling:

```env
ENABLE_BACKPRESSURE=true
QUEUE_WARNING_THRESHOLD=10000
QUEUE_CRITICAL_THRESHOLD=50000
QUEUE_RECOVERY_THRESHOLD=5000
DEFAULT_EVENT_PRIORITY=5
```

## Configuration Details

### ENABLE_BACKPRESSURE
- **Type**: Boolean (string)
- **Default**: `true`
- **Description**: Enable/disable backpressure handling
- **Values**: 
  - `true` - Backpressure active (recommended for production)
  - `false` - Backpressure disabled (for testing only)

### QUEUE_WARNING_THRESHOLD
- **Type**: Integer
- **Default**: `10000`
- **Description**: Queue depth at which warnings are logged
- **Recommended Values**:
  - **Development**: `1000`
  - **Production (10k req/s)**: `10000`
  - **Production (100k req/s)**: `50000`

### QUEUE_CRITICAL_THRESHOLD
- **Type**: Integer
- **Default**: `50000`
- **Description**: Queue depth at which circuit opens and low-priority events are rejected
- **Recommended Values**:
  - **Development**: `5000`
  - **Production (10k req/s)**: `50000`
  - **Production (100k req/s)**: `200000`

### QUEUE_RECOVERY_THRESHOLD
- **Type**: Integer
- **Default**: `5000`
- **Description**: Queue depth at which circuit closes and normal operation resumes
- **Recommended Values**:
  - **Development**: `500`
  - **Production (10k req/s)**: `5000`
  - **Production (100k req/s)**: `25000`

### DEFAULT_EVENT_PRIORITY
- **Type**: Integer (1-10)
- **Default**: `5`
- **Description**: Default priority for events without explicit priority
- **Priority Levels**:
  - `1` - Critical (always accepted)
  - `5` - Normal (default)
  - `10` - Low (dropped first)

## Configuration Presets

### Development Environment
```env
ENABLE_BACKPRESSURE=true
QUEUE_WARNING_THRESHOLD=1000
QUEUE_CRITICAL_THRESHOLD=5000
QUEUE_RECOVERY_THRESHOLD=500
DEFAULT_EVENT_PRIORITY=5
```

### Staging Environment
```env
ENABLE_BACKPRESSURE=true
QUEUE_WARNING_THRESHOLD=5000
QUEUE_CRITICAL_THRESHOLD=25000
QUEUE_RECOVERY_THRESHOLD=2500
DEFAULT_EVENT_PRIORITY=5
```

### Production (10k req/s target)
```env
ENABLE_BACKPRESSURE=true
QUEUE_WARNING_THRESHOLD=10000
QUEUE_CRITICAL_THRESHOLD=50000
QUEUE_RECOVERY_THRESHOLD=5000
DEFAULT_EVENT_PRIORITY=5
RULE_ENGINE_WORKER_CONCURRENCY=20
```

### Production (100k req/s target)
```env
ENABLE_BACKPRESSURE=true
QUEUE_WARNING_THRESHOLD=50000
QUEUE_CRITICAL_THRESHOLD=200000
QUEUE_RECOVERY_THRESHOLD=25000
DEFAULT_EVENT_PRIORITY=5
RULE_ENGINE_WORKER_CONCURRENCY=50
```

## Tuning Guidelines

### When to Adjust Thresholds

#### Increase Thresholds When:
- ❌ Frequent false positives (circuit opening unnecessarily)
- ❌ High rejection rate for valid traffic
- ✅ Workers consistently handling load without issues
- ✅ Redis has sufficient memory headroom

#### Decrease Thresholds When:
- ❌ Redis approaching memory limits
- ❌ Worker processes becoming unresponsive
- ❌ Database connection pool exhaustion
- ❌ System crashes under load

### Calculation Formula

```
Warning Threshold = Worker Count × Worker Concurrency × 50
Critical Threshold = Warning Threshold × 5
Recovery Threshold = Warning Threshold × 0.5
```

**Example (3 workers, 20 concurrency):**
```
Warning = 3 × 20 × 50 = 3,000
Critical = 3,000 × 5 = 15,000
Recovery = 3,000 × 0.5 = 1,500
```

## Monitoring Your Configuration

### Check Current Settings
```bash
curl http://localhost:3000/api/v1/metrics/queue | jq '.backpressure.thresholds'
```

### Verify Backpressure Status
```bash
curl http://localhost:3000/api/v1/metrics/queue/summary
```

### Watch Queue Depth
```bash
watch -n 1 'curl -s http://localhost:3000/api/v1/metrics/queue/summary | jq ".queueDepth, .circuitState"'
```

## Troubleshooting

### Problem: Circuit opens too frequently

**Symptom**: `circuitState: "OPEN"` appears often

**Solutions**:
1. Increase `QUEUE_CRITICAL_THRESHOLD`
2. Add more worker processes
3. Increase `RULE_ENGINE_WORKER_CONCURRENCY`

### Problem: System still crashes under load

**Symptom**: OOM errors despite backpressure

**Solutions**:
1. Decrease `QUEUE_CRITICAL_THRESHOLD`
2. Enable backpressure: `ENABLE_BACKPRESSURE=true`
3. Upgrade Redis memory
4. Scale worker processes

### Problem: Too many events rejected

**Symptom**: High `rejectedCount` in metrics

**Solutions**:
1. Check if traffic is genuinely too high (scale infrastructure)
2. Verify worker health: `GET /api/v1/health`
3. Increase thresholds if workers are healthy
4. Review event priority distribution

## Best Practices

### DO ✅
- Enable backpressure in production
- Monitor circuit state via Prometheus
- Set up alerts for circuit OPEN events
- Test threshold changes in staging first
- Document custom threshold rationale

### DON'T ❌
- Disable backpressure in production
- Set thresholds higher than Redis memory allows
- Ignore circuit OPEN alerts
- Change thresholds during high traffic
- Use same thresholds across all environments

## Related Documentation

- [Backpressure Handling System](./BACKPRESSURE-HANDLING.md)
- [Architecture Evaluation](./ARCHITECTURE-EVALUATION.md)
- [Flow Diagram](./FLOW-DIAGRAM.md)
