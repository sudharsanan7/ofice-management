const DashboardService = require('../services/dashboard.service');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await DashboardService.getSummary();
  return successResponse(res, { message: 'Dashboard summary retrieved successfully.', data: summary });
});

module.exports = { getSummary };
