const CalendarEvent = require('../models/CalendarEvent');
const User = require('../models/User');
const mongoose = require('mongoose');
const ActivityLoggerService = require('./activityLogger.service');

class CalendarEventService {
  static async getEvents({ startDate, endDate }) {
    return CalendarEvent.find({ date: { $gte: startDate, $lt: endDate } })
      .populate('assignedTo', 'name designation')
      .sort({ date: 1, title: 1 })
      .lean();
  }

  static async getAssignees() {
    return User.find({ status: 'active' })
      .select('name designation')
      .sort({ name: 1 })
      .lean();
  }

  static async ensureActiveAssignee(userId) {
    const user = await User.findOne({ _id: userId, status: 'active' }).select('_id');
    if (!user) {
      const error = new Error('The selected assignee is not an active team member.');
      error.statusCode = 400;
      throw error;
    }
  }

  static async createEvent({ data, reqUser, ipAddress }) {
    await this.ensureActiveAssignee(data.assignedTo);
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      const error = new Error('End time must be later than start time.');
      error.statusCode = 400;
      throw error;
    }
    const { repeat = 'none', repeatCount = 1, ...fields } = data;
    const seriesId = repeat === 'none' ? null : new mongoose.Types.ObjectId();
    const occurrences = Array.from({ length: repeat === 'none' ? 1 : repeatCount }, (_, index) => {
      const date = new Date(fields.date);
      if (repeat === 'weekly') date.setDate(date.getDate() + index * 7);
      if (repeat === 'monthly') {
        const day = date.getDate();
        date.setDate(1);
        date.setMonth(date.getMonth() + index);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(day, lastDay));
      }
      return { ...fields, date, seriesId, createdBy: reqUser._id };
    });
    const [event] = await CalendarEvent.insertMany(occurrences);
    await ActivityLoggerService.log({ user: reqUser._id, action: 'CREATE', entity: 'CalendarEvent', entityId: event._id, meta: { title: event.title }, ipAddress });
    return CalendarEvent.findById(event._id).populate('assignedTo', 'name designation');
  }

  static async updateEvent({ eventId, data, reqUser, ipAddress }) {
    if (data.assignedTo) await this.ensureActiveAssignee(data.assignedTo);

    const event = await CalendarEvent.findByIdAndUpdate(eventId, data, {
      new: true,
      runValidators: true
    }).populate('assignedTo', 'name designation');

    if (!event) {
      const error = new Error('Calendar task not found.');
      error.statusCode = 404;
      throw error;
    }

    await ActivityLoggerService.log({ user: reqUser._id, action: 'UPDATE', entity: 'CalendarEvent', entityId: event._id, meta: { title: event.title }, ipAddress });
    return event;
  }

  static async deleteEvent({ eventId, reqUser, ipAddress }) {
    const event = await CalendarEvent.findByIdAndDelete(eventId);
    if (!event) {
      const error = new Error('Calendar task not found.');
      error.statusCode = 404;
      throw error;
    }
    await ActivityLoggerService.log({ user: reqUser._id, action: 'DELETE', entity: 'CalendarEvent', entityId: event._id, meta: { title: event.title }, ipAddress });
  }
}

module.exports = CalendarEventService;
