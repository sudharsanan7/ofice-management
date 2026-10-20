const Joi = require('joi');

const idParamsSchema = Joi.object({ id: Joi.string().hex().length(24).required() });
const createPaymentSchema = Joi.object({
  invoice: Joi.string().hex().length(24).required(),
  amount: Joi.number().greater(0).required(),
  method: Joi.string().valid('upi', 'bank_transfer', 'cheque', 'cash', 'card', 'other').required(),
  paymentDate: Joi.date().iso().default(() => new Date()),
  referenceNumber: Joi.string().trim().max(80).allow(''),
  notes: Joi.string().trim().max(2000).allow('')
}).unknown(false);
const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  invoice: Joi.string().hex().length(24),
  client: Joi.string().hex().length(24),
  method: Joi.string().valid('upi', 'bank_transfer', 'cheque', 'cash', 'card', 'other'),
  startDate: Joi.string().isoDate(),
  endDate: Joi.string().isoDate()
}).unknown(false);

module.exports = { idParamsSchema, createPaymentSchema, listQuerySchema };
