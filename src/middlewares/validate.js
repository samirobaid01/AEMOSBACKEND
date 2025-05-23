const { ApiError } = require('./errorHandler');

const validate = (schema, options = {}) => {
  return async (req, res, next) => {
    try {
      // If options.query is true, treat the schema as query schema
      if (options.query) {
        const { error } = schema.validate(req.query);
        if (error) {
          throw new ApiError(400, `Invalid query parameters: ${error.details[0].message}`);
        }
        return next();
      }

      // Handle both schema structures (direct and nested)
      const bodySchema = schema.body || schema.create || schema;
      const querySchema = schema.query;
      const paramsSchema = schema.params;

      if (paramsSchema) {
        const { error } = paramsSchema.validate(req.params);
        if (error) {
          throw new ApiError(400, `Invalid parameters: ${error.details[0].message}`);
        }
      }

      if (querySchema) {
        const { error } = querySchema.validate(req.query);
        if (error) {
          throw new ApiError(400, `Invalid query parameters: ${error.details[0].message}`);
        }
      }

      if (bodySchema) {
        const { error } = bodySchema.validate(req.body);
        if (error) {
          throw new ApiError(400, `Invalid request body: ${error.details[0].message}`);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validate; 