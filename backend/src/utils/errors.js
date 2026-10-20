const createError = (message, statusCode = 400, errors = null) =>
  Object.assign(new Error(message), { statusCode, errors });

module.exports = { createError };
