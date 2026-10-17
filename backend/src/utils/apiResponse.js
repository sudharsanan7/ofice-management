/**
 * Consistent API Response Helper
 * Format: { success, message, data, errors }
 */

const successResponse = (res, { statusCode = 200, message = 'Success', data = null } = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    errors: null
  });
};

const errorResponse = (res, { statusCode = 500, message = 'Internal Server Error', errors = null, data = null } = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data,
    errors: errors ? (Array.isArray(errors) ? errors : [errors]) : null
  });
};

module.exports = {
  successResponse,
  errorResponse
};
