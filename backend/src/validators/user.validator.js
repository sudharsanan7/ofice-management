const Joi = require('joi');

const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters long'
  }),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required',
    'string.email': 'A valid email is required'
  }),
  phone: Joi.string().trim().allow('').default(''),
  designation: Joi.string().trim().allow('').default('Team Member'),
  role: Joi.string().valid('admin', 'team_member').default('team_member')
});

const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).messages({
    'string.min': 'Name must be at least 2 characters long'
  }),
  phone: Joi.string().trim().allow(''),
  designation: Joi.string().trim().allow(''),
  role: Joi.string().valid('admin', 'team_member')
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required().messages({
    'any.only': 'Status must be either active or inactive',
    'any.required': 'Status is required'
  })
});

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  phone: Joi.string().trim().allow(''),
  designation: Joi.string().trim().allow(''),
  avatar: Joi.string().trim().allow('')
  // Any extra field like role, status, email will be stripped by Joi with stripUnknown: true
}).min(1);

const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Current password is required'
  }),
  newPassword: Joi.string().min(6).max(100).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'New password must be at least 6 characters long'
  })
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  updateProfileSchema,
  updatePasswordSchema
};
