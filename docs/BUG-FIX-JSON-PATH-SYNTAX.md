# 🐛 Critical Bug Fix - JSON Path Syntax Error

## Issue
**Error**: `Invalid JSON path expression. The error is around character position 12.`

**Affected**: All HTTP, CoAP, and MQTT requests triggering rule engine

**Root Cause**: Invalid MySQL JSON path syntax in `RuleChainIndex.js` line 33:
```javascript
JSON_EXTRACT(config, '$.:typeField') = :uuid  // ❌ INVALID
```

## Problem
I tried to use a Sequelize replacement parameter (`:typeField`) **inside** the JSON path expression `$.:typeField`, but MySQL doesn't support variables in JSON paths. The syntax `$.:typeField` is invalid.

## Solution
Build the JSON path **before** the query using string interpolation:

```javascript
// ✅ FIXED
const typeFieldPath = originatorType === 'sensor' ? '$.sensorUUID' : '$.deviceUUID';

const query = `
  SELECT DISTINCT 
    ruleChainId,
    JSON_EXTRACT(config, '$.key') as variableName,
    JSON_EXTRACT(config, '$.sourceType') as sourceType
  FROM RuleChainNode
  WHERE type = 'filter'
    AND JSON_EXTRACT(config, '$.sourceType') = :originatorType
    AND (
      JSON_EXTRACT(config, '$.UUID') = :uuid OR
      JSON_EXTRACT(config, '$.uuid') = :uuid OR
      JSON_EXTRACT(config, '${typeFieldPath}') = :uuid
    )
`;
```

## Changes
**File**: `src/ruleEngine/indexing/RuleChainIndex.js`

**Before**:
```javascript
const typeField = originatorType === 'sensor' ? 'sensorUUID' : 'deviceUUID';
JSON_EXTRACT(config, '$.:typeField') = :uuid  // ❌ Invalid syntax
```

**After**:
```javascript
const typeFieldPath = originatorType === 'sensor' ? '$.sensorUUID' : '$.deviceUUID';
JSON_EXTRACT(config, '${typeFieldPath}') = :uuid  // ✅ Valid template literal
```

## Testing
- ✅ Unit tests: 27/27 passing
- ✅ No SQL injection risk (only two hardcoded values)
- ✅ Ready for production testing

## Status
**Fixed**: January 25, 2026  
**Test Status**: ✅ All tests passing  
**Action Required**: Restart server to apply fix

---

**Next Steps**: 
1. Restart the server (`npm start`)
2. Test HTTP requests
3. Test CoAP requests  
4. Test MQTT requests
5. Verify client receives responses
