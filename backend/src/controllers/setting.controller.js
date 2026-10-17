const SettingService = require('../services/setting.service');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get organization settings (any authenticated user)
 * @route   GET /api/settings
 */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await SettingService.getSettings();

  return successResponse(res, {
    message: 'System settings retrieved successfully',
    data: settings
  });
});

/**
 * @desc    Update organization settings (admin only)
 * @route   PUT /api/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
  const settings = await SettingService.updateSettings({
    data: req.body,
    file: req.file,
    reqUser: req.user,
    ipAddress: req.ip
  });

  return successResponse(res, {
    message: 'System settings updated successfully',
    data: settings
  });
});

module.exports = {
  getSettings,
  updateSettings
};
