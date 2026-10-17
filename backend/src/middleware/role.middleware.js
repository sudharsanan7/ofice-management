const { hasPermission } = require('../config/permissions');
const { errorResponse } = require('../utils/apiResponse');

/**
 * RBAC Middleware: Checks if the authenticated user has permission
 * for the requested module and action.
 * 
 * @param {string} moduleName - Module to check (e.g., 'users', 'clients')
 * @param {string} action - Action to check (e.g., 'create', 'read', 'manage_status')
 */
const can = (moduleName, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication required prior to permission evaluation.'
      });
    }

    const permitted = hasPermission(req.user.role, moduleName, action);

    if (!permitted) {
      return errorResponse(res, {
        statusCode: 403,
        message: `Forbidden: You do not have permission to ${action} in ${moduleName}.`
      });
    }

    next();
  };
};

/**
 * Strict Admin Check Middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return errorResponse(res, {
      statusCode: 403,
      message: 'Forbidden: Administrator privileges required.'
    });
  }
  next();
};

module.exports = {
  can,
  requireAdmin
};
