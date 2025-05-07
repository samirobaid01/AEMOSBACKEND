const Joi = require('joi');

// Authentication validation schemas
const authSchema = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),
  
  signup: Joi.object({
    userName: Joi.string().min(3).max(256).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    phoneNumber: Joi.string().max(50),
    notifyByEmail: Joi.boolean().default(false),
    notifyBySMS: Joi.boolean().default(false),
    notifyByMessage: Joi.boolean().default(false),
    smsNumber: Joi.string().max(50).when('notifyBySMS', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    detail: Joi.string(),
    termsAndConditions: Joi.boolean().valid(true).required()
      .messages({
        'any.only': 'You must accept the terms and conditions'
      }),
    notifyUser: Joi.boolean().default(false)
  })
};

module.exports = authSchema; 