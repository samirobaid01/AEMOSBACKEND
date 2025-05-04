const Joi = require('joi');
const { ApiError } = require('./errorHandler');

/**
 * Validator middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {String} property - Request property to validate (body, params, query)
 * @returns {Function} Express middleware
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (!error) {
      next();
    } else {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      next(new ApiError(400, `Validation error: ${errorMessages}`));
    }
  };
};

module.exports = validate; 