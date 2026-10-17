const { errorResponse } = require('../utils/apiResponse');

/**
 * 404 Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  return errorResponse(res, {
    statusCode: 404,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    errors: [{ path: req.originalUrl, message: 'Resource not found' }]
  });
};

/**
 * Central Error Handler Middleware
 * Catches all forwarded errors, formats consistent response, hides stack trace in production.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource identifier: ${err.value}`;
    errors = [{ field: err.path, message: 'Resource identifier is malformed' }];
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}. It must be unique.`;
    errors = [{ field, message: `${field} already exists` }];
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors || {}).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    errors = [{ message: 'Authentication token is invalid or malformed' }];
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
    errors = [{ message: 'Token expired, please log in again' }];
  }

  // Hide stack trace in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction && statusCode === 500) {
    console.error('[Error Details]:', err);
  }

  return errorResponse(res, {
    statusCode,
    message,
    errors
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
