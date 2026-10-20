const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('admin', 'team_member')
}).unknown(false);

const setupAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().trim().allow(''),
  designation: Joi.string().trim().allow('')
}).unknown(false);

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required()
}).unknown(false);

const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(16).max(256).required(),
  password: Joi.string().min(8).max(128).required()
}).unknown(false);

module.exports = { loginSchema, setupAdminSchema, forgotPasswordSchema, resetPasswordSchema };
