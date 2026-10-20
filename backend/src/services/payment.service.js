const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Setting = require('../models/Setting');
const { generateNumber } = require('./counter.service');
const InvoiceService = require('./invoice.service');
const ActivityLoggerService = require('./activityLogger.service');
const { createError } = require('../utils/errors');

class PaymentService {
  static async createPayment({ data, reqUser, ipAddress }) {
    if (!mongoose.Types.ObjectId.isValid(data.invoice)) throw createError('Invalid invoice ID.', 400);
    const invoice = await Invoice.findById(data.invoice);
    if (!invoice) throw createError('Invoice not found.', 404);
    const amount = Number(data.amount);
    if (!(amount > 0)) throw createError('Payment amount must be greater than 0.', 400);
    const outstanding = Math.round((invoice.grandTotal - invoice.amountPaid) * 100) / 100;
    if (amount - outstanding > 0.009) throw createError(`Payment exceeds outstanding balance of ${outstanding}.`, 400);
    const settings = await Setting.getSettings();
    const paymentNumber = await generateNumber(settings.numberingPrefixes?.payment || 'PAY', new Date(data.paymentDate || Date.now()));
    const payment = await Payment.create({
      paymentNumber,
      invoice: invoice._id,
      client: invoice.clientId,
      amount,
      method: data.method,
      paymentDate: data.paymentDate || new Date(),
      referenceNumber: data.referenceNumber || '',
      notes: data.notes || '',
      createdBy: reqUser._id
    });
    await InvoiceService.applyPayment(invoice, amount, reqUser);
    await ActivityLoggerService.log({
      user: reqUser._id, action: 'CREATE', entity: 'Payment', entityId: payment._id,
      meta: { paymentNumber, amount, invoiceNumber: invoice.invoiceNumber, method: data.method }, ipAddress
    });
    return Payment.findById(payment._id).populate('invoice', 'invoiceNumber grandTotal amountPaid balanceDue status').populate('client', 'companyName contactPerson email').populate('createdBy', 'name email');
  }

  static async getPayments(filters = {}) {
    const { page = 1, limit = 10, invoice, client, method, startDate, endDate } = filters;
    const query = {};
    if (invoice) query.invoice = invoice;
    if (client) query.client = client;
    if (method) query.method = method;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
    const [payments, total] = await Promise.all([
      Payment.find(query).sort({ paymentDate: -1, createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
        .populate('invoice', 'invoiceNumber status grandTotal').populate('client', 'companyName contactPerson email').populate('createdBy', 'name').lean(),
      Payment.countDocuments(query)
    ]);
    return { payments, pagination: { page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  static async getPaymentById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw createError('Invalid payment ID.', 400);
    const payment = await Payment.findById(id)
      .populate('invoice', 'invoiceNumber status grandTotal amountPaid balanceDue')
      .populate('client', 'companyName contactPerson email')
      .populate('createdBy', 'name email');
    if (!payment) throw createError('Payment not found.', 404);
    return payment;
  }

  static async deletePayment({ paymentId, reqUser, ipAddress }) {
    if (reqUser.role !== 'admin') throw createError('Forbidden: Only administrators can delete payments.', 403);
    const payment = await Payment.findById(paymentId);
    if (!payment) throw createError('Payment not found.', 404);
    const invoice = await Invoice.findById(payment.invoice);
    await payment.deleteOne();
    if (invoice) {
      invoice.amountPaid = Math.max(0, Math.round((invoice.amountPaid - payment.amount) * 100) / 100);
      invoice.balanceDue = Math.max(0, Math.round((invoice.grandTotal - invoice.amountPaid) * 100) / 100);
      const { deriveStatus } = require('./invoice.service');
      const nextStatus = deriveStatus(invoice.amountPaid, invoice.grandTotal, invoice.dueDate, invoice.status);
      if (nextStatus !== invoice.status) {
        invoice.statusHistory.push({ status: nextStatus, changedBy: reqUser._id, changedAt: new Date() });
        invoice.status = nextStatus;
      }
      invoice.updatedBy = reqUser._id;
      await invoice.save();
    }
    await ActivityLoggerService.log({
      user: reqUser._id, action: 'DELETE', entity: 'Payment', entityId: paymentId,
      meta: { paymentNumber: payment.paymentNumber, amount: payment.amount }, ipAddress
    });
    return { message: 'Payment deleted successfully.' };
  }
}

module.exports = PaymentService;
