# P1 Issue #4: Validate Rule Chain Config UUIDs - Implementation Plan

**Status**: 📋 **PLAN READY FOR REVIEW**  
**Date**: January 25, 2026  
**Effort**: 1 day (8 hours)  
**Priority**: 🟠 P1 (Security Enhancement)

---

## 🎯 **EXECUTIVE SUMMARY**

Add comprehensive UUID validation for rule chain node configurations to prevent:
- Invalid UUIDs causing silent rule execution failures
- Index pollution in Redis cache
- Security risks from malformed input
- Debugging difficulties

**Impact**: Security + Reliability + Developer Experience

---

## 📋 **PROBLEM STATEMENT**

### **Current State**

Rule chain nodes accept **any string** as UUID without validation:

```javascript
// src/services/ruleChainService.js
async createNode(data) {
  // ❌ No UUID validation
  const node = await RuleChainNode.create(data);
  return node;
}
```

**Example Invalid Configs Currently Accepted**:
```json
{
  "sourceType": "sensor",
  "UUID": "not-a-valid-uuid",  // ❌ Invalid
  "key": "temperature",
  "operator": ">",
  "value": 30
}
```

### **Risks**

1. **Silent Failures**: Rules never execute because UUID doesn't match any sensor/device
2. **Index Pollution**: Redis cache filled with invalid keys (`rulechain:var:sensor:invalid-uuid`)
3. **Debugging Difficulty**: Hard to trace why rules don't trigger
4. **Security**: Potential SQL injection if UUIDs used in raw queries (low risk, but best practice)
5. **Data Integrity**: Typos never caught (`aaabbb123` vs `aaabbb12`)

### **Real-World Impact**

- **User reports**: "My rule chain isn't triggering"
- **Root cause**: Invalid UUID in filter config
- **Time to debug**: Hours of investigation
- **Prevention**: Validation at create/update time

---

## ✅ **ACCEPTANCE CRITERIA**

### **AC1: Filter Node UUID Validation**
- [ ] All UUIDs in filter node configs validated on create/update
- [ ] Validates: `UUID`, `uuid`, `sensorUUID`, `deviceUUID` fields
- [ ] Supports both sensor and device source types

### **AC2: Action Node UUID Validation**
- [ ] Device UUIDs in action node configs validated
- [ ] Validates: `config.command.deviceUuid`

### **AC3: Error Messages**
- [ ] Clear, actionable error messages
- [ ] Includes path to invalid UUID (e.g., `config.UUID`)
- [ ] Shows current invalid value

### **AC4: UUID Format Support**
- [ ] Supports UUID v4 format (standard)
- [ ] Optionally supports custom hex format (if needed)
- [ ] Configurable via environment variable

### **AC5: Nested Expression Support**
- [ ] Validates UUIDs in nested AND/OR expressions
- [ ] Handles complex filter structures

### **AC6: Audit Script**
- [ ] Script to identify existing invalid configs
- [ ] Reports all nodes with invalid UUIDs
- [ ] Safe to run on production (read-only)

### **AC7: Testing**
- [ ] Unit tests for validator utility
- [ ] Integration tests for create/update endpoints
- [ ] Edge cases covered (null, empty, malformed)

**Total**: 7 acceptance criteria

---

## 🏗️ **ARCHITECTURE & TECHNICAL APPROACH**

### **UUID Format Analysis**

Based on codebase review:
- **Sensor/Device UUIDs**: `STRING(36)` in database → UUID v4 format
- **Current Validators**: Device validator uses `Joi.string().uuid()` (UUID v4)
- **Recommendation**: Validate as UUID v4 only (standard format)

### **Config Structure**

**Filter Node Config**:
```json
{
  "sourceType": "sensor",
  "UUID": "550e8400-e29b-41d4-a716-446655440000",
  "key": "temperature",
  "operator": ">",
  "value": 30
}
```

**Action Node Config**:
```json
{
  "type": "device_command",
  "command": {
    "deviceUuid": "550e8400-e29b-41d4-a716-446655440000",
    "value": "on"
  }
}
```

**Complex Filter (AND/OR)**:
```json
{
  "type": "AND",
  "expressions": [
    {
      "sourceType": "sensor",
      "UUID": "550e8400-e29b-41d4-a716-446655440000",
      "key": "temperature",
      "operator": ">",
      "value": 30
    },
    {
      "sourceType": "device",
      "UUID": "660e8400-e29b-41d4-a716-446655440001",
      "key": "status",
      "operator": "==",
      "value": "active"
    }
  ]
}
```

### **Solution: Multi-Layer Validation**

#### **Layer 1: UUID Validation Utility**

```javascript
// src/utils/uuidValidator.js
const { validate: isUUID } = require('uuid');

const validateUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') {
    return { 
      valid: false, 
      error: 'UUID must be a non-empty string' 
    };
  }
  
  if (isUUID(uuid, 4)) {
    return { valid: true };
  }
  
  return {
    valid: false,
    error: `Invalid UUID format: "${uuid}". Expected UUID v4 format (e.g., 550e8400-e29b-41d4-a716-446655440000)`
  };
};
```

#### **Layer 2: Config Validation**

```javascript
const validateRuleChainConfig = (config, nodeType) => {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    return { valid: true }; // Empty config is valid
  }
  
  if (nodeType === 'filter') {
    const validateFilterConfig = (expr, path = 'config') => {
      // Handle nested AND/OR expressions
      if (expr.type && (expr.type === 'AND' || expr.type === 'OR') && expr.expressions) {
        expr.expressions.forEach((subExpr, idx) => {
          validateFilterConfig(subExpr, `${path}.expressions[${idx}]`);
        });
      } else {
        // Leaf filter node - validate UUID fields
        const uuidFields = ['UUID', 'uuid', 'sensorUUID', 'deviceUUID'];
        uuidFields.forEach(field => {
          if (expr[field]) {
            const result = validateUUID(expr[field]);
            if (!result.valid) {
              errors.push({
                path: `${path}.${field}`,
                value: expr[field],
                error: result.error
              });
            }
          }
        });
      }
    };
    
    validateFilterConfig(config);
  } else if (nodeType === 'action') {
    // Validate action device UUID
    if (config.command && config.command.deviceUuid) {
      const result = validateUUID(config.command.deviceUuid);
      if (!result.valid) {
        errors.push({
          path: 'config.command.deviceUuid',
          value: config.command.deviceUuid,
          error: result.error
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
```

#### **Layer 3: Service Integration**

```javascript
// src/services/ruleChainService.js
const { validateRuleChainConfig } = require('../utils/uuidValidator');

async createNode(data) {
  // Parse config if string
  let config = data.config;
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config);
    } catch (err) {
      throw new Error('Invalid JSON in config field');
    }
  }
  
  // Validate UUIDs in config
  if (config) {
    const validation = validateRuleChainConfig(config, data.type);
    if (!validation.valid) {
      const error = new Error('Invalid rule chain node configuration');
      error.statusCode = 400;
      error.details = validation.errors;
      throw error;
    }
  }
  
  // Continue with existing create logic...
  const node = await RuleChainNode.create(data);
  return node;
}
```

#### **Layer 4: Enhanced Error Response**

```javascript
// src/controllers/ruleChainController.js
const createNode = async (req, res, next) => {
  try {
    const node = await ruleChainService.createNode(req.body);
    res.status(201).json(node);
  } catch (error) {
    if (error.statusCode === 400 && error.details) {
      return res.status(400).json({
        error: error.message,
        validationErrors: error.details,
        message: 'One or more UUIDs in the configuration are invalid'
      });
    }
    next(error);
  }
};
```

---

## 📁 **FILES TO CREATE/MODIFY**

### **New Files (3)**
1. `src/utils/uuidValidator.js` - UUID validation utility
2. `scripts/audit-rule-chain-uuids.js` - Audit script for existing configs
3. `tests/unit/uuidValidator.test.js` - Unit tests

### **Modified Files (2)**
4. `src/services/ruleChainService.js` - Add validation to `createNode` and `updateNode`
5. `src/controllers/ruleChainController.js` - Enhanced error responses

**Total**: 5 files

---

## 🧪 **TESTING STRATEGY**

### **Unit Tests** (`tests/unit/uuidValidator.test.js`)

```javascript
describe('UUID Validator', () => {
  test('should validate UUID v4 format', () => {
    const result = validateUUID('550e8400-e29b-41d4-a716-446655440000');
    expect(result.valid).toBe(true);
  });

  test('should reject invalid UUID format', () => {
    const result = validateUUID('not-a-uuid');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid UUID format');
  });

  test('should validate filter config with single UUID', () => {
    const config = {
      sourceType: 'sensor',
      UUID: '550e8400-e29b-41d4-a716-446655440000',
      key: 'temperature',
      operator: '>',
      value: 30
    };
    const result = validateRuleChainConfig(config, 'filter');
    expect(result.valid).toBe(true);
  });

  test('should validate nested AND/OR expressions', () => {
    const config = {
      type: 'AND',
      expressions: [
        { UUID: '550e8400-e29b-41d4-a716-446655440000', ... },
        { UUID: '660e8400-e29b-41d4-a716-446655440001', ... }
      ]
    };
    const result = validateRuleChainConfig(config, 'filter');
    expect(result.valid).toBe(true);
  });

  test('should reject invalid UUID in nested expression', () => {
    const config = {
      type: 'AND',
      expressions: [
        { UUID: 'invalid-uuid', ... }
      ]
    };
    const result = validateRuleChainConfig(config, 'filter');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should validate action node device UUID', () => {
    const config = {
      type: 'device_command',
      command: {
        deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
        value: 'on'
      }
    };
    const result = validateRuleChainConfig(config, 'action');
    expect(result.valid).toBe(true);
  });
});
```

### **Integration Tests**

- Test create node endpoint with invalid UUID
- Test update node endpoint with invalid UUID
- Test error response format
- Test that valid UUIDs still work

---

## 📊 **IMPLEMENTATION PLAN**

### **Phase 1: Core Validation (4 hours)**

1. **Create UUID Validator** (`src/utils/uuidValidator.js`)
   - `validateUUID()` function
   - `validateRuleChainConfig()` function
   - Support for filter and action nodes
   - Support for nested AND/OR expressions

2. **Integrate into Service** (`src/services/ruleChainService.js`)
   - Add validation to `createNode()`
   - Add validation to `updateNode()`
   - Parse JSON config if string
   - Throw structured errors

3. **Enhanced Error Responses** (`src/controllers/ruleChainController.js`)
   - Catch validation errors
   - Return detailed error messages
   - Include path and value for each error

### **Phase 2: Testing & Audit (3 hours)**

4. **Unit Tests** (`tests/unit/uuidValidator.test.js`)
   - All validation paths
   - Edge cases (null, empty, malformed)
   - Nested expressions

5. **Integration Tests**
   - API endpoint tests
   - Error response format tests

6. **Audit Script** (`scripts/audit-rule-chain-uuids.js`)
   - Read all rule chain nodes
   - Validate each config
   - Report invalid UUIDs
   - Safe for production (read-only)

### **Phase 3: Documentation (1 hour)**

7. **Documentation**
   - Update `docs/P1-WORK-PLAN.md` status
   - Create `docs/UUID-VALIDATION.md` (if needed)
   - Update API documentation

---

## 🚨 **RISKS & MITIGATION**

### **Risk 1: Breaking Existing Configs**
**Mitigation**: 
- Audit script identifies invalid configs first
- Fix invalid configs before deploying validation
- Validation only on create/update (not on read)

### **Risk 2: Performance Impact**
**Mitigation**:
- Validation is synchronous and fast (< 1ms)
- Only runs on create/update (not on every read)
- UUID validation is regex-based (very fast)

### **Risk 3: False Positives**
**Mitigation**:
- Use standard UUID v4 validation (proven library)
- Clear error messages help identify issues
- Audit script allows fixing before deployment

---

## ✅ **SUCCESS METRICS**

- [ ] 100% of new rule chain nodes have validated UUIDs
- [ ] Zero invalid UUIDs in production (after audit + fixes)
- [ ] Clear error messages reduce support tickets
- [ ] Validation overhead < 1ms per create/update

---

## 🎯 **READY FOR IMPLEMENTATION**

**Estimated Effort**: 1 day (8 hours)
- Phase 1: Core Validation (4h)
- Phase 2: Testing & Audit (3h)
- Phase 3: Documentation (1h)

**Dependencies**: None (independent issue)

**Risk Level**: Low (validation only, no breaking changes)

---

**Please review and approve this plan before proceeding with implementation!** 🚀
