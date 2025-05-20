const Joi = require('joi');

const createStateInstance = {
  body: Joi.object({
    deviceUuid: Joi.string().uuid().required(),
    stateName: Joi.string().max(50).required(),
    value: Joi.string().max(100).required(),
    initiatedBy: Joi.string().valid('user', 'device', 'system', 'rule').default('user')
  })
};

module.exports = {
  createStateInstance
}; 