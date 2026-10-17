const Joi = require('joi');

const updateSettingSchema = Joi.object({
  companyName: Joi.string().trim().allow(''),
  cin: Joi.string().trim().allow(''),
  gstin: Joi.string().trim().allow(''),
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    postalCode: Joi.string().allow(''),
    country: Joi.string().allow('')
  }).optional(),
  state: Joi.string().trim().allow(''),
  email: Joi.string().trim().email({ tlds: { allow: false } }).allow(''),
  phone: Joi.string().trim().allow(''),
  logo: Joi.string().allow(''),
  defaultGstRate: Joi.number().min(0).max(100),
  defaultQuotationValidityDays: Joi.number().min(1),
  defaultInvoiceDueDays: Joi.number().min(0),
  numberingPrefixes: Joi.object({
    quotation: Joi.string().trim().uppercase().allow(''),
    invoice: Joi.string().trim().uppercase().allow(''),
    payment: Joi.string().trim().uppercase().allow('')
  }).optional(),
  defaultPaymentConditions: Joi.string().allow(''),
  defaultQuotationTerms: Joi.string().allow(''),
  defaultInvoiceNotes: Joi.string().allow(''),
  bankDetails: Joi.object({
    accountName: Joi.string().allow(''),
    accountNumber: Joi.string().allow(''),
    bankName: Joi.string().allow(''),
    ifscCode: Joi.string().allow(''),
    branch: Joi.string().allow(''),
    upiId: Joi.string().allow('')
  }).optional()
});

module.exports = {
  updateSettingSchema
};
