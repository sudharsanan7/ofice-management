const mongoose = require('mongoose');
const { successResponse } = require('../utils/apiResponse');

const getHealth = (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  return successResponse(res, {
    message: 'OfficeFlow API is healthy and operational',
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        host: mongoose.connection.host || null,
        name: mongoose.connection.name || null
      },
      environment: process.env.NODE_ENV || 'development'
    }
  });
};

module.exports = {
  getHealth
};
