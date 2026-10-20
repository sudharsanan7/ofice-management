const Joi = require('joi');
const { EXPENSE_CATEGORIES } = require('../models/Expense');

const idParamsSchema = Joi.object({ id: Joi.string().hex().length(24).required() });
const createExpenseSchema = Joi.object({
  category: Joi.string().valid(...EXPENSE_CATEGORIES).required(),
  description: Joi.string().trim().min(1).max(2000).required(),
  amount: Joi.number().greater(0).required(),
  expenseDate: Joi.date().iso().default(() => new Date())
}).unknown(false);
const updateExpenseSchema = Joi.object({
  category: Joi.string().valid(...EXPENSE_CATEGORIES),
  description: Joi.string().trim().min(1).max(2000),
  amount: Joi.number().greater(0),
  expenseDate: Joi.date().iso()
}).min(1).unknown(false);
const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  category: Joi.string().valid('all', ...EXPENSE_CATEGORIES),
  search: Joi.string().trim().max(120).allow(''),
  startDate: Joi.string().isoDate(),
  endDate: Joi.string().isoDate()
}).unknown(false);

module.exports = { idParamsSchema, createExpenseSchema, updateExpenseSchema, listQuerySchema };
