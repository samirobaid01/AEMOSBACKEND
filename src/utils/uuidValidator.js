const { validate: isUUID } = require('uuid');

const validateUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') {
    return { 
      valid: false, 
      error: 'UUID must be a non-empty string' 
    };
  }
  
  const trimmed = uuid.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'UUID cannot be empty or whitespace only'
    };
  }
  
  if (isUUID(trimmed, 4)) {
    return { valid: true };
  }
  
  return {
    valid: false,
    error: `Invalid UUID format: "${trimmed}". Expected UUID v4 format (e.g., 550e8400-e29b-41d4-a716-446655440000)`
  };
};

const validateRuleChainConfig = (config, nodeType) => {
  const errors = [];
  
  if (!config) {
    return { valid: true };
  }
  
  if (typeof config !== 'object') {
    return {
      valid: false,
      errors: [{
        path: 'config',
        value: config,
        error: 'Config must be an object'
      }]
    };
  }
  
  if (nodeType === 'filter') {
    const validateFilterConfig = (expr, path = 'config') => {
      if (!expr || typeof expr !== 'object') {
        return;
      }
      
      if (expr.type && (expr.type === 'AND' || expr.type === 'OR') && Array.isArray(expr.expressions)) {
        expr.expressions.forEach((subExpr, idx) => {
          validateFilterConfig(subExpr, `${path}.expressions[${idx}]`);
        });
      } else {
        const uuidFields = ['UUID', 'uuid', 'sensorUUID', 'deviceUUID'];
        uuidFields.forEach(field => {
          if (expr[field] !== undefined && expr[field] !== null) {
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
    if (config.command && typeof config.command === 'object') {
      if (config.command.deviceUuid !== undefined && config.command.deviceUuid !== null) {
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
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateUUID,
  validateRuleChainConfig
};
