const { errorResponse } = require('../utils/apiResponse');

/**
 * Joi Schema Validation Middleware
 * Validates request payload and replaces with stripped/sanitized value
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: ''
        }
      }
    });

    if (error) {
      const formattedErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return errorResponse(res, {
        statusCode: 400,
        message: 'Request validation failed',
        errors: formattedErrors
      });
    }

    // Replace request property with validated and sanitized data
    req[property] = value;
    next();
  };
};

module.exports = validate;
