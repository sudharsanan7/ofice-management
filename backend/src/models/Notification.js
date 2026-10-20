const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['event_reminder', 'invoice_due', 'invoice_overdue', 'system'],
      required: true
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    entity: { type: String, default: '' },
    entityId: { type: String, default: null },
    read: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ type: 1, entityId: 1, user: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
