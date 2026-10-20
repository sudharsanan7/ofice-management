const CalendarEventService = require('../services/calendarEvent.service');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getEvents = asyncHandler(async (req, res) => {
  const events = await CalendarEventService.getEvents(req.query);
  return successResponse(res, { message: 'Calendar tasks retrieved successfully.', data: { events } });
});

const getAssignees = asyncHandler(async (req, res) => {
  const assignees = await CalendarEventService.getAssignees();
  return successResponse(res, { message: 'Active team members retrieved successfully.', data: { assignees } });
});

const createEvent = asyncHandler(async (req, res) => {
  const event = await CalendarEventService.createEvent({ data: req.body, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { statusCode: 201, message: 'Calendar task created successfully.', data: event });
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await CalendarEventService.updateEvent({ eventId: req.params.id, data: req.body, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: 'Calendar task updated successfully.', data: event });
});

const deleteEvent = asyncHandler(async (req, res) => {
  await CalendarEventService.deleteEvent({ eventId: req.params.id, reqUser: req.user, ipAddress: req.ip });
  return successResponse(res, { message: 'Calendar task deleted successfully.', data: null });
});

module.exports = { getEvents, getAssignees, createEvent, updateEvent, deleteEvent };
