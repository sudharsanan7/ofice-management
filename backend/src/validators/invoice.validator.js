const Joi = require('joi');
const { itemSchema } = require('./quotation.validator');

const idParamsSchema = Joi.object({ id: Joi.string().hex().length(24).required() });
const createInvoiceSchema = Joi.object({
  client: Joi.string().hex().length(24),
  clientId: Joi.string().hex().length(24),
  quotationId: Joi.string().hex().length(24).allow(null),
  issueDate: Joi.date().iso().default(() => new Date()),
  dueDate: Joi.date().iso().required(),
  items: Joi.array().items(itemSchema).min(1).required(),
  notes: Joi.string().max(10000).allow(''),
  paymentTerms: Joi.string().max(10000).allow('')
}).or('client', 'clientId').unknown(false);
const updateInvoiceSchema = Joi.object({
  client: Joi.string().hex().length(24),
  clientId: Joi.string().hex().length(24),
  issueDate: Joi.date().iso(),
  dueDate: Joi.date().iso(),
  items: Joi.array().items(itemSchema).min(1),
  notes: Joi.string().max(10000).allow(''),
  paymentTerms: Joi.string().max(10000).allow('')
}).min(1).unknown(false);
const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(120).allow(''),
  status: Joi.string().valid('all', 'unpaid', 'partially_paid', 'paid', 'overdue'),
  client: Joi.string().hex().length(24),
  clientId: Joi.string().hex().length(24),
  startDate: Joi.string().isoDate(),
  endDate: Joi.string().isoDate(),
  sort: Joi.string().default('-createdAt')
}).unknown(false);
const sendEmailSchema = Joi.object({
  subject: Joi.string().trim().max(250),
  message: Joi.string().max(10000).allow(''),
  cc: Joi.alternatives().try(Joi.string().email(), Joi.array().items(Joi.string().email()).max(10))
}).unknown(false);
const convertSchema = Joi.object({
  issueDate: Joi.date().iso(),
  dueDate: Joi.date().iso(),
  notes: Joi.string().max(10000).allow(''),
  paymentTerms: Joi.string().max(10000).allow('')
}).unknown(false);

module.exports = { idParamsSchema, createInvoiceSchema, updateInvoiceSchema, listQuerySchema, sendEmailSchema, convertSchema };
