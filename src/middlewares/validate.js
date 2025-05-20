const { ApiError } = require('./errorHandler');

const validate = (schema) => {
  return async (req, res, next) => {
    try {
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
          throw new ApiError(400, `Invalid query: ${error.details[0].message}`);
        }
      }

      if (bodySchema) {
        const { error } = bodySchema.validate(req.body);
        if (error) {
          throw new ApiError(400, `Invalid body: ${error.details[0].message}`);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validate; 