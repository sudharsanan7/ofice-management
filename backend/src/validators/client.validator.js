const Joi = require('joi');
const { GSTIN_REGEX } = require('../models/Client');

const createClientSchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(150).required().messages({
    'string.empty': 'Company name is required',
    'string.min': 'Company name must be at least 2 characters long'
  }),
  contactPerson: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Contact person name is required'
  }),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required',
    'string.email': 'A valid email is required'
  }),
  phone: Joi.string().trim().allow('').default(''),
  cin: Joi.string().trim().uppercase().allow('').default(''),
  gstin: Joi.string()
    .trim()
    .uppercase()
    .pattern(GSTIN_REGEX)
    .allow('')
    .default('')
    .messages({
      'string.pattern.base': 'Invalid GSTIN format. Expected 15-character Indian GST format (e.g., 33AAAAA0000A1Z5).'
    }),
  billingAddress: Joi.object({
    line1: Joi.string().trim().allow('').default(''),
    line2: Joi.string().trim().allow('').default(''),
    city: Joi.string().trim().allow('').default(''),
    state: Joi.string().trim().allow('').default(''),
    pincode: Joi.string().trim().allow('').default('')
  }).default({}),
  stateCode: Joi.string().trim().allow('').default(''),
  notes: Joi.string().allow('').default(''),
  status: Joi.string().valid('active', 'archived').default('active')
});

const updateClientSchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(150),
  contactPerson: Joi.string().trim().min(2).max(100),
  email: Joi.string().trim().email({ tlds: { allow: false } }),
  phone: Joi.string().trim().allow(''),
  cin: Joi.string().trim().uppercase().allow(''),
  gstin: Joi.string().trim().uppercase().pattern(GSTIN_REGEX).allow('').messages({
    'string.pattern.base': 'Invalid GSTIN format. Expected 15-character Indian GST format (e.g., 33AAAAA0000A1Z5).'
  }),
  billingAddress: Joi.object({
    line1: Joi.string().trim().allow(''),
    line2: Joi.string().trim().allow(''),
    city: Joi.string().trim().allow(''),
    state: Joi.string().trim().allow(''),
    pincode: Joi.string().trim().allow('')
  }),
  stateCode: Joi.string().trim().allow(''),
  notes: Joi.string().allow(''),
  status: Joi.string().valid('active', 'archived')
}).min(1);

const archiveClientSchema = Joi.object({
  status: Joi.string().valid('active', 'archived').required()
});

module.exports = {
  createClientSchema,
  updateClientSchema,
  archiveClientSchema
};
