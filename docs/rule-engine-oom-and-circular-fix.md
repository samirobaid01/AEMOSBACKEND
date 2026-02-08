# Rule Engine: OOM and Circular Execution Fixes

Document describing the problems, root causes, and code changes. Use this to create tickets and track work.

---

## 1. Problems Observed

### 1.1 JavaScript heap out of memory (OOM)

- **Symptom:** Worker process crashed with:
  - `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`
  - Occurred when running `npm run worker` (rule engine worker).
- **Stack traces pointed to:**
  - First occurrence: `Object.entries()` (large object iteration).
  - Second occurrence: `Array.prototype.sort()` during async callback after stream read (DB/Redis response handling).
- **Context:** Crash happened during rule chain execution and/or index rebuild activity (SQL for rule chain nodes visible in logs).

### 1.2 Circular rule chain execution (infinite loop)

- **Symptom:** Application crashed or became unresponsive; one rule chain was configured as a loop: Filter01 → Action01 → Filter01 → Action01 → … running indefinitely.
- **Effect:** CPU and memory grew without bound until OOM or process kill.
- **Root cause:** Execution follows `nextNodeId` with no check for already-visited nodes, so a cycle in the graph causes an infinite `while (currentNode)` loop.

---

## 2. Root Causes

### 2.1 OOM – overlapping index rebuilds

- **Cause:** Every RuleChain and RuleChainNode create/update/destroy triggers an index rebuild via model hooks in `initModels.js`.
- **Effect:** Many rapid saves (e.g. bulk save, UI saving a large chain) caused many **concurrent** `rebuildIndexForRuleChain(ruleChainId)` calls.
- **Each rebuild:** Loads that rule chain’s filter nodes, extracts sensor UUIDs, then runs `Promise.all(sensorUUIDs.map(buildIndexForSensor))` — i.e. one concurrent DB + Redis op per sensor.
- **Result:** High concurrency and large in-memory structures; heap spiked and GC could not recover within the (e.g. 512 MB) limit.

### 2.2 OOM – single large rule chain load in `trigger()`

- **Cause:** `ruleChainService.trigger(sensorUUID, variableNames)` loads **all** matching rule chains in one go:
  - `RuleChain.findAll({ where: { id: ruleChainIds }, include: [RuleChainNode] })`.
- **Effect:** When `getRuleChainsForSensor()` returns many IDs (hundreds/thousands), one query loads all those rule chains and all their nodes. Sequelize/DB driver may sort or assemble this result in memory.
- **Result:** A single very large result set and in-memory sort led to `Array.prototype.sort` allocation failure and OOM (especially with limited heap, e.g. 512 MB).

### 2.3 OOM – circular execution

- **Cause:** A rule chain whose nodes form a cycle (e.g. Filter01 → Action01 → Filter01) was executed. The engine follows `nextNodeId` in a `while (currentNode)` loop with no cycle detection.
- **Effect:** The same nodes run repeatedly; each iteration allocates more data; memory and CPU grow until crash.

### 2.4 No cycle detection at runtime

- **Cause:** `execute()` did not track visited node IDs or cap execution steps.
- **Effect:** Any cycle in the node graph caused unbounded execution and resource exhaustion.

---

## 3. Changes Implemented

### 3.1 Index rebuild: debounce and batching (IndexManager + initModels)

| Item | Description |
|------|-------------|
| **File(s)** | `src/ruleEngine/indexing/IndexManager.js`, `src/models/initModels.js` |
| **Problem addressed** | Overlapping index rebuilds and unbounded concurrency (OOM). |
| **Change** | 1) **Debounce:** New `scheduleRebuildForRuleChain(ruleChainId)` with 500 ms debounce per `ruleChainId`. Model hooks call this instead of `rebuildIndexForRuleChain` directly. Rapid hook fires for the same rule chain result in a single rebuild after the delay.<br>2) **Batching:** Sensor index builds run in batches of 10 (`BATCH_SIZE = 10`) instead of `Promise.all` over all sensor UUIDs. `rebuildIndexForRuleChain` and `rebuildAllIndexes` use `buildIndexForSensorsBatched()`. |
| **Exports** | `scheduleRebuildForRuleChain` (used by hooks), `rebuildIndexForRuleChain`, `rebuildAllIndexes`. |
| **Dev-only** | When `NODE_ENV=development`, logs for scheduled rebuild, running debounced rebuild, and rebuild (with ruleChainId, sensor count, batch size/count). |

**Ticket idea:** “Debounce and batch rule chain index rebuilds to prevent OOM from overlapping rebuilds.”

---

### 3.2 Rule chain loading in batches in `trigger()` (ruleChainService)

| Item | Description |
|------|-------------|
| **File(s)** | `src/services/ruleChainService.js` |
| **Problem addressed** | Single huge Sequelize result and in-memory sort when a sensor triggers many rule chains (OOM at `Array.prototype.sort`). |
| **Change** | Process `ruleChainIds` in chunks of 50 (`RULE_CHAIN_TRIGGER_BATCH_SIZE = 50`). For each chunk: `RuleChain.findAll({ where: { id: chunk }, include: [RuleChainNode] })`, then run the existing per–rule-chain logic. Never load more than 50 rule chains (and their nodes) at once. Return still uses `totalRuleChains: ruleChainIds.length` and the same `results` array. |
| **Ticket idea** | “Batch rule chain loading in trigger() to prevent OOM from loading thousands of chains in one query.” |

---

### 3.3 Circular execution guard in `execute()` (ruleChainService)

| Item | Description |
|------|-------------|
| **File(s)** | `src/services/ruleChainService.js` |
| **Problem addressed** | Infinite loop when a rule chain’s node graph has a cycle (Filter01 → Action01 → Filter01 → …). |
| **Change** | 1) **Visited set:** Before executing a node, check if `currentNode.id` is in a `visitedNodeIds` Set. If yes, log “Circular rule chain detected”, set `abortedReason = 'circular'`, and break.<br>2) **Max steps:** Allow at most 1000 node steps per execution (`MAX_EXECUTION_STEPS`). If exceeded, log “Rule chain exceeded max execution steps”, set `abortedReason = 'max_steps'`, and break.<br>3) **Return value:** When aborted, return `status: 'aborted'`, `summary.abortedReason`, and `meta.abortedReason` so callers know execution was stopped. |
| **Ticket idea** | “Add runtime guard against circular rule chain execution (visited-node check + max steps).” |

---

### 3.4 Worker heap (package.json) – optional / reverted by you

- **File:** `package.json`
- **Change:** Worker script was temporarily set to `NODE_OPTIONS='--max-old-space-size=4096'`. You reverted to 512 MB to avoid raising memory without fixing root causes.
- **Recommendation:** Keep 512 MB; rely on debounce, batching, and circular guard. If OOM persists, profile (e.g. `--heap-prof`) and consider a modest increase only with evidence.

**Ticket idea (optional):** “Document worker heap policy: keep 512 MB unless profiling justifies increase.”

---

## 4. Suggested Tickets (summary)

1. **Rule engine OOM – index rebuilds**  
   Debounce and batch rule chain index rebuilds (IndexManager + initModels) to prevent OOM from overlapping rebuilds and unbounded concurrency.  
   *Status: Done.*

2. **Rule engine OOM – trigger loading**  
   Batch rule chain loading in `trigger()` (e.g. 50 chains per batch) to avoid loading thousands of chains + nodes in one query and OOM at sort.  
   *Status: Done.*

3. **Rule engine – circular execution**  
   Add runtime guard in `execute()`: detect cycles via visited-node set, cap execution at max steps, return `aborted` with reason.  
   *Status: Done.*

4. **Rule engine – circular validation at save (optional)**  
   Validate rule chain graph on save (e.g. when updating nodes/nextNodeId): detect cycles and reject save with a clear error so circular chains cannot be saved.  
   *Status: Not implemented.*

5. **Docs – rule engine OOM and circular fix**  
   Document problems, root causes, and changes for OOM and circular execution (this file).  
   *Status: Done.*

---

## 5. Files Touched (quick reference)

| File | Changes |
|------|---------|
| `src/ruleEngine/indexing/IndexManager.js` | Debounce `scheduleRebuildForRuleChain`, batch sensor builds, dev logging. |
| `src/models/initModels.js` | Hooks call `scheduleRebuildForRuleChain` instead of `rebuildIndexForRuleChain`. |
| `src/services/ruleChainService.js` | Batched loading in `trigger()`; circular guard + max steps + aborted result in `execute()`. |
| `package.json` | Worker script (you kept 512 MB heap). |
| `docs/rule-engine-oom-and-circular-fix.md` | This document. |

---

## 6. Verification

- **OOM (rebuilds):** Under load (e.g. many RuleChainNode saves), worker should not OOM; dev logs show debounced/batched rebuilds.
- **OOM (trigger):** When a sensor triggers many rule chains, worker should complete without OOM; at most 50 chains + nodes in memory per batch.
- **Circular:** Configure a chain Filter → Action → Filter (same filter). Run trigger; execution should stop at second visit to the filter, log “Circular rule chain detected”, and return `status: 'aborted'`, `abortedReason: 'circular'`.
