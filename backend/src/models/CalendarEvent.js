const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [160, 'Task title cannot exceed 160 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: ''
    },
    date: {
      type: Date,
      required: [true, 'Task date is required'],
      index: true
    },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    location: { type: String, trim: true, maxlength: 300, default: '' },
    meetingUrl: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: String, enum: ['general', 'meeting', 'deadline', 'leave', 'other'], default: 'general' },
    seriesId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'An assignee is required'],
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done'],
      default: 'todo',
      index: true
    }
  },
  { timestamps: true }
);

calendarEventSchema.index({ date: 1, assignedTo: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
