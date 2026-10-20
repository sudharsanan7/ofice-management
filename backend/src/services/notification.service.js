const Notification = require('../models/Notification');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const CalendarEvent = require('../models/CalendarEvent');
class NotificationService {
  static async createIfMissing({ user, type, title, message, entity, entityId }) {
    const existing = await Notification.findOne({ user, type, entityId: String(entityId || '') });
    if (existing) return existing;
    return Notification.create({ user, type, title, message, entity, entityId: entityId ? String(entityId) : null });
  }

  static async getNotifications({ userId, page = 1, limit = 20, unreadOnly = false }) {
    const query = { user: userId };
    if (unreadOnly) query.read = false;
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: userId, read: false })
    ]);
    return { notifications, unreadCount, pagination: { page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  static async markRead({ notificationId, userId }) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { $set: { read: true } },
      { new: true }
    );
    return notification;
  }

  static async markAllRead(userId) {
    await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });
    return { message: 'All notifications marked as read.' };
  }

  static async generateDueAndReminderNotifications() {
    const admins = await User.find({ role: 'admin', status: 'active' }).select('_id email name');
    const now = new Date();
    const inThreeDays = new Date(now.getTime() + 3 * 86400000);
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const [dueSoon, overdue, eventsToday] = await Promise.all([
      Invoice.find({ status: { $in: ['unpaid', 'partially_paid'] }, dueDate: { $gte: now, $lte: inThreeDays } }).populate('clientId', 'companyName'),
      Invoice.find({ status: 'overdue' }).populate('clientId', 'companyName'),
      CalendarEvent.find({ date: { $gte: todayStart, $lte: todayEnd } }).populate('assignedTo', 'name email')
    ]);

    let created = 0;
    for (const invoice of dueSoon) {
      for (const admin of admins) {
        const doc = await this.createIfMissing({
          user: admin._id,
          type: 'invoice_due',
          title: `Invoice ${invoice.invoiceNumber} due soon`,
          message: `${invoice.clientId?.companyName || 'A client'} has invoice ${invoice.invoiceNumber} due on ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}.`,
          entity: 'Invoice',
          entityId: invoice._id
        });
        if (doc && doc.createdAt && Date.now() - new Date(doc.createdAt).getTime() < 5000) created += 1;
      }
    }
    for (const invoice of overdue) {
      for (const admin of admins) {
        await this.createIfMissing({
          user: admin._id,
          type: 'invoice_overdue',
          title: `Invoice ${invoice.invoiceNumber} overdue`,
          message: `${invoice.clientId?.companyName || 'A client'} invoice ${invoice.invoiceNumber} is overdue.`,
          entity: 'Invoice',
          entityId: invoice._id
        });
      }
    }
    for (const event of eventsToday) {
      const assigneeId = event.assignedTo?._id || event.assignedTo;
      if (!assigneeId) continue;
      await this.createIfMissing({
        user: assigneeId,
        type: 'event_reminder',
        title: `Today: ${event.title}`,
        message: event.description || 'You have a calendar event scheduled today.',
        entity: 'CalendarEvent',
        entityId: event._id
      });
    }
    return created;
  }
}

module.exports = NotificationService;
