const Client = require('../models/Client');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const CalendarEvent = require('../models/CalendarEvent');
const ActivityLog = require('../models/ActivityLog');

class DashboardService {
  static async getSummary() {
    const now = new Date();
    const upcomingEnd = new Date(now.getTime() + 14 * 86400000);
    const [
      totalClients,
      quotationCount,
      invoiceCount,
      paidInvoices,
      outstandingAgg,
      expenseAgg,
      paymentAgg,
      upcomingEvents,
      recentActivity
    ] = await Promise.all([
      Client.countDocuments({ status: 'active' }),
      Quotation.countDocuments(),
      Invoice.countDocuments(),
      Invoice.countDocuments({ status: 'paid' }),
      Invoice.aggregate([
        { $match: { status: { $in: ['unpaid', 'partially_paid', 'overdue'] } } },
        { $group: { _id: null, outstanding: { $sum: '$balanceDue' }, invoiced: { $sum: '$grandTotal' } } }
      ]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      CalendarEvent.find({ date: { $gte: now, $lte: upcomingEnd } })
        .populate('assignedTo', 'name designation')
        .sort({ date: 1 })
        .limit(8)
        .lean(),
      ActivityLog.find({})
        .populate('user', 'name email')
        .sort({ timestamp: -1 })
        .limit(8)
        .lean()
    ]);

    const outstanding = outstandingAgg[0]?.outstanding || 0;
    const revenue = paymentAgg[0]?.total || 0;
    const expenses = expenseAgg[0]?.total || 0;
    const activeQuotations = await Quotation.countDocuments({ status: { $in: ['draft', 'sent'] } });

    return {
      totals: {
        clients: totalClients,
        quotations: quotationCount,
        activeQuotations,
        invoices: invoiceCount,
        paidInvoices,
        revenue,
        outstanding,
        expenses,
        net: Math.round((revenue - expenses) * 100) / 100
      },
      upcomingEvents,
      recentActivity
    };
  }
}

module.exports = DashboardService;
