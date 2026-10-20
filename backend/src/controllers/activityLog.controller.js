const ActivityLoggerService = require('../services/activityLogger.service');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getLogs = asyncHandler(async (req, res) => {
  const result = await ActivityLoggerService.getLogs(req.query);
  return successResponse(res, { message: 'Activity logs retrieved successfully.', data: result });
});

module.exports = { getLogs };
