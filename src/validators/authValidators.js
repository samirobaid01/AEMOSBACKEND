const Joi = require('joi');

// Authentication validation schemas
const authSchema = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};

module.exports = authSchema; 