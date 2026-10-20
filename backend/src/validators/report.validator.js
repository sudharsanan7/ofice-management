const Joi = require('joi');

const reportQuerySchema = Joi.object({
  startDate: Joi.string().isoDate().allow(''),
  endDate: Joi.string().isoDate().allow(''),
  format: Joi.string().valid('xlsx', 'pdf')
}).unknown(false);

const logsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  entity: Joi.string().trim().max(40).allow(''),
  user: Joi.string().hex().length(24)
}).unknown(false);

module.exports = { reportQuerySchema, logsQuerySchema };
