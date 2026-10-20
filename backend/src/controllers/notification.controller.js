const NotificationService = require('../services/notification.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const result = await NotificationService.getNotifications({
    userId: req.user._id,
    page: req.query.page,
    limit: req.query.limit,
    unreadOnly: req.query.unread === 'true'
  });
  return successResponse(res, { message: 'Notifications retrieved successfully.', data: result });
});
const markRead = asyncHandler(async (req, res) => {
  const notification = await NotificationService.markRead({ notificationId: req.params.id, userId: req.user._id });
  if (!notification) return errorResponse(res, { statusCode: 404, message: 'Notification not found.' });
  return successResponse(res, { message: 'Notification marked as read.', data: notification });
});
const markAllRead = asyncHandler(async (req, res) => {
  const result = await NotificationService.markAllRead(req.user._id);
  return successResponse(res, { message: result.message, data: null });
});

module.exports = { getNotifications, markRead, markAllRead };
