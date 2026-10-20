const Joi = require('joi');

const idParamsSchema = Joi.object({ id: Joi.string().hex().length(24).required() });
const itemSchema = Joi.object({
  description: Joi.string().trim().min(1).max(2000).required(),
  sacCode: Joi.string().trim().max(40).allow('').default(''),
  quantity: Joi.number().greater(0).required(),
  unitPrice: Joi.number().min(0).required(),
  discount: Joi.number().min(0).default(0),
  gstRate: Joi.number().valid(0, 5, 12, 18, 28).required(),
  lineSubtotal: Joi.any().strip(),
  cgst: Joi.any().strip(),
  sgst: Joi.any().strip(),
  igst: Joi.any().strip(),
  lineTotal: Joi.any().strip(),
  amount: Joi.any().strip()
}).unknown(false);
const createQuotationSchema = Joi.object({
  client: Joi.string().hex().length(24).required(),
  issueDate: Joi.date().iso().default(() => new Date()),
  validUntil: Joi.date().iso().required(),
  items: Joi.array().items(itemSchema).min(1).required(),
  terms: Joi.string().max(10000).allow(''),
  notes: Joi.string().max(10000).allow(''),
  subtotal: Joi.any().strip(),
  totalDiscount: Joi.any().strip(),
  cgstTotal: Joi.any().strip(),
  sgstTotal: Joi.any().strip(),
  igstTotal: Joi.any().strip(),
  grandTotal: Joi.any().strip()
}).unknown(false).custom((value, helpers) => {
  if (value.validUntil < value.issueDate) return helpers.error('date.afterIssueDate');
  return value;
}).messages({ 'date.afterIssueDate': 'Valid until must be on or after issue date' });
const updateQuotationSchema = Joi.object({
  client: Joi.string().hex().length(24),
  issueDate: Joi.date().iso(),
  validUntil: Joi.date().iso(),
  items: Joi.array().items(itemSchema).min(1),
  terms: Joi.string().max(10000).allow(''),
  notes: Joi.string().max(10000).allow(''),
  subtotal: Joi.any().strip(),
  totalDiscount: Joi.any().strip(),
  cgstTotal: Joi.any().strip(),
  sgstTotal: Joi.any().strip(),
  igstTotal: Joi.any().strip(),
  grandTotal: Joi.any().strip()
}).min(1).unknown(false).custom((value, helpers) => {
  if (value.issueDate && value.validUntil && value.validUntil < value.issueDate) return helpers.error('date.afterIssueDate');
  return value;
}).messages({ 'date.afterIssueDate': 'Valid until must be on or after issue date' });
const updateStatusSchema = Joi.object({ status: Joi.string().valid('sent', 'accepted', 'rejected', 'expired').required() }).unknown(false);
const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(120).allow(''),
  status: Joi.string().valid('all', 'draft', 'sent', 'accepted', 'rejected', 'expired'),
  client: Joi.string().hex().length(24),
  clientId: Joi.string().hex().length(24),
  startDate: Joi.string().isoDate(),
  endDate: Joi.string().isoDate(),
  sort: Joi.string().valid('createdAt', '-createdAt', 'issueDate', '-issueDate', 'validUntil', '-validUntil', 'grandTotal', '-grandTotal', 'quotationNumber', '-quotationNumber').default('-createdAt')
}).unknown(false).custom((value, helpers) => {
  if (value.startDate && value.endDate && value.startDate > value.endDate) return helpers.error('date.range');
  return value;
}).messages({ 'date.range': 'Start date must be on or before end date' });
const sendEmailSchema = Joi.object({
  subject: Joi.string().trim().max(250),
  message: Joi.string().max(10000).allow(''),
  cc: Joi.alternatives().try(Joi.string().email(), Joi.array().items(Joi.string().email()).max(10))
}).unknown(false);

module.exports = { idParamsSchema, itemSchema, createQuotationSchema, updateQuotationSchema, updateStatusSchema, listQuerySchema, sendEmailSchema };
