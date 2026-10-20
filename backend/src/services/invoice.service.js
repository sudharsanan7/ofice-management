const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Quotation = require('../models/Quotation');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Setting = require('../models/Setting');
const { generateNumber } = require('./counter.service');
const { calculateTotals } = require('./pricing');
const { generateInvoicePDF } = require('./invoicePdf');
const mailerService = require('./mailer.service');
const ActivityLoggerService = require('./activityLogger.service');
const { createError } = require('../utils/errors');

const isAdmin = (user) => user?.role === 'admin';
const sameId = (left, right) => String(left?._id || left) === String(right?._id || right);

const deriveStatus = (amountPaid, grandTotal, dueDate, currentStatus) => {
  const paid = Number(amountPaid) || 0;
  const total = Number(grandTotal) || 0;
  if (paid >= total && total > 0) return 'paid';
  const overdue = dueDate && new Date(dueDate) < new Date(new Date().toDateString());
  if (paid > 0 && paid < total) return overdue ? 'overdue' : 'partially_paid';
  if (overdue && paid < total) return 'overdue';
  if (currentStatus === 'overdue' && !overdue && paid === 0) return 'unpaid';
  return paid > 0 ? 'partially_paid' : 'unpaid';
};

class InvoiceService {
  static taxTypeFor(client, settings) {
    const clientState = String(client.billingAddress?.state || client.stateCode || '').trim().toLowerCase();
    const companyState = String(settings.state || '').trim().toLowerCase();
    return clientState && companyState && clientState !== companyState ? 'inter' : 'intra';
  }

  static mapTotals(totals, extra = {}) {
    return {
      items: totals.items,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      discountAmount: totals.totalDiscount,
      gstAmount: totals.totalTax,
      cgstAmount: totals.cgstTotal,
      sgstAmount: totals.sgstTotal,
      igstAmount: totals.igstTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      totalAmount: totals.grandTotal,
      grandTotal: totals.grandTotal,
      taxType: totals.taxType,
      ...extra
    };
  }

  static async findInvoice(id, { populate = false } = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw createError('Invalid invoice ID.', 400);
    let query = Invoice.findById(id);
    if (populate) {
      query = query
        .populate('clientId')
        .populate('quotationId', 'quotationNumber status')
        .populate('createdBy', 'name email designation')
        .populate('statusHistory.changedBy', 'name email');
    }
    const invoice = await query;
    if (!invoice) throw createError('Invoice not found.', 404);
    if (populate && invoice.clientId) invoice.client = invoice.clientId;
    return invoice;
  }

  static async createInvoice({ data, reqUser, ipAddress }) {
    const client = await Client.findById(data.client || data.clientId);
    if (!client) throw createError('Client not found.', 404);
    const settings = await Setting.getSettings();
    const taxType = this.taxTypeFor(client, settings);
    const totals = calculateTotals(data.items, taxType);
    const issueDate = data.issueDate || new Date();
    const dueDate = data.dueDate || new Date(Date.now() + (settings.defaultInvoiceDueDays || 15) * 86400000);
    if (new Date(dueDate) < new Date(issueDate)) throw createError('Due date must be on or after the issue date.', 400);
    const invoiceNumber = await generateNumber(settings.numberingPrefixes?.invoice || 'INV', new Date(issueDate));
    const grandTotal = totals.grandTotal;
    const invoice = await Invoice.create({
      invoiceNumber,
      quotationId: data.quotationId || null,
      clientId: client._id,
      issueDate,
      dueDate,
      notes: data.notes ?? settings.defaultInvoiceNotes ?? '',
      paymentTerms: data.paymentTerms ?? settings.defaultPaymentConditions ?? '',
      createdBy: reqUser._id,
      updatedBy: reqUser._id,
      amountPaid: 0,
      balanceDue: grandTotal,
      status: deriveStatus(0, grandTotal, dueDate),
      statusHistory: [{ status: 'unpaid', changedBy: reqUser._id }],
      ...this.mapTotals(totals)
    });
    await ActivityLoggerService.log({
      user: reqUser._id, action: 'CREATE', entity: 'Invoice', entityId: invoice._id,
      meta: { invoiceNumber, grandTotal, client: client.companyName }, ipAddress
    });
    return this.findInvoice(invoice._id, { populate: true });
  }

  static async convertFromQuotation({ quotationId, data = {}, reqUser, ipAddress }) {
    if (!mongoose.Types.ObjectId.isValid(quotationId)) throw createError('Invalid quotation ID.', 400);
    const quotation = await Quotation.findById(quotationId).populate('client');
    if (!quotation) throw createError('Quotation not found.', 404);
    if (quotation.status !== 'accepted') throw createError('Only accepted quotations can be converted to invoices.', 400);
    if (quotation.convertedToInvoice) throw createError('This quotation has already been converted to an invoice.', 400);
    const settings = await Setting.getSettings();
    const issueDate = data.issueDate || new Date();
    const dueDate = data.dueDate || new Date(Date.now() + (settings.defaultInvoiceDueDays || 15) * 86400000);
    const invoice = await this.createInvoice({
      data: {
        client: quotation.client._id,
        quotationId: quotation._id,
        items: quotation.items.map((item) => item.toObject ? item.toObject() : item),
        issueDate,
        dueDate,
        notes: data.notes ?? quotation.notes ?? settings.defaultInvoiceNotes,
        paymentTerms: data.paymentTerms ?? settings.defaultPaymentConditions
      },
      reqUser,
      ipAddress
    });
    quotation.convertedToInvoice = invoice._id;
    quotation.updatedBy = reqUser._id;
    await quotation.save();
    await ActivityLoggerService.log({
      user: reqUser._id, action: 'CONVERT', entity: 'Quotation', entityId: quotation._id,
      meta: { quotationNumber: quotation.quotationNumber, invoiceNumber: invoice.invoiceNumber, invoiceId: invoice._id },
      ipAddress
    });
    return invoice;
  }

  static async getInvoices(filters = {}) {
    const { page = 1, limit = 10, search, status, client, clientId, startDate, endDate, sort = '-createdAt' } = filters;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (client || clientId) query.clientId = client || clientId;
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    if (search?.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const clientIds = await Client.find({ companyName: { $regex: escaped, $options: 'i' } }).distinct('_id');
      query.$or = [{ invoiceNumber: { $regex: escaped, $options: 'i' } }, { clientId: { $in: clientIds } }];
    }
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
    const sortField = ['createdAt', 'issueDate', 'dueDate', 'grandTotal', 'invoiceNumber', 'totalAmount'].includes(String(sort).replace(/^-/, '')) ? sort : '-createdAt';
    const [invoices, total] = await Promise.all([
      Invoice.find(query).sort(sortField).skip((pageNumber - 1) * pageSize).limit(pageSize)
        .populate('clientId', 'companyName contactPerson email phone gstin').populate('createdBy', 'name email').lean(),
      Invoice.countDocuments(query)
    ]);
    const mapped = invoices.map((invoice) => ({ ...invoice, client: invoice.clientId }));
    return { invoices: mapped, pagination: { page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  static async getInvoiceById(id) {
    return this.findInvoice(id, { populate: true });
  }

  static async updateInvoice({ invoiceId, data, reqUser, ipAddress }) {
    const invoice = await this.findInvoice(invoiceId);
    if (!isAdmin(reqUser)) throw createError('Forbidden: Only administrators can update invoices.', 403);
    if (invoice.status === 'paid') throw createError('Paid invoices cannot be modified.', 400);
    const client = await Client.findById(data.client || data.clientId || invoice.clientId);
    if (!client) throw createError('Client not found.', 404);
    const settings = await Setting.getSettings();
    const taxType = this.taxTypeFor(client, settings);
    const totals = calculateTotals(data.items || invoice.items, taxType);
    if (totals.grandTotal < invoice.amountPaid) {
      throw createError('Invoice total cannot be lower than payments already recorded.', 400);
    }
    Object.assign(invoice, this.mapTotals(totals));
    invoice.clientId = client._id;
    if (data.issueDate !== undefined) invoice.issueDate = data.issueDate;
    if (data.dueDate !== undefined) invoice.dueDate = data.dueDate;
    if (data.notes !== undefined) invoice.notes = data.notes;
    if (data.paymentTerms !== undefined) invoice.paymentTerms = data.paymentTerms;
    if (new Date(invoice.dueDate) < new Date(invoice.issueDate)) throw createError('Due date must be on or after the issue date.', 400);
    invoice.balanceDue = Math.max(0, Math.round((invoice.grandTotal - invoice.amountPaid) * 100) / 100);
    const nextStatus = deriveStatus(invoice.amountPaid, invoice.grandTotal, invoice.dueDate, invoice.status);
    if (nextStatus !== invoice.status) {
      invoice.statusHistory.push({ status: nextStatus, changedBy: reqUser._id, changedAt: new Date() });
      invoice.status = nextStatus;
    }
    invoice.updatedBy = reqUser._id;
    await invoice.save();
    await ActivityLoggerService.log({ user: reqUser._id, action: 'UPDATE', entity: 'Invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber }, ipAddress });
    return this.findInvoice(invoice._id, { populate: true });
  }

  static async deleteInvoice({ invoiceId, reqUser, ipAddress }) {
    if (!isAdmin(reqUser)) throw createError('Forbidden: Only administrators can delete invoices.', 403);
    const invoice = await this.findInvoice(invoiceId);
    const payments = await Payment.countDocuments({ invoice: invoice._id });
    if (payments > 0 || invoice.amountPaid > 0) throw createError('Cannot delete an invoice that has recorded payments.', 400);
    await invoice.deleteOne();
    await Quotation.updateMany({ convertedToInvoice: invoice._id }, { $set: { convertedToInvoice: null } });
    await ActivityLoggerService.log({ user: reqUser._id, action: 'DELETE', entity: 'Invoice', entityId: invoiceId, meta: { invoiceNumber: invoice.invoiceNumber }, ipAddress });
    return { message: 'Invoice deleted successfully.' };
  }

  static async applyPayment(invoice, amount, reqUser) {
    invoice.amountPaid = Math.round((Number(invoice.amountPaid) + Number(amount)) * 100) / 100;
    invoice.balanceDue = Math.max(0, Math.round((invoice.grandTotal - invoice.amountPaid) * 100) / 100);
    const nextStatus = deriveStatus(invoice.amountPaid, invoice.grandTotal, invoice.dueDate, invoice.status);
    if (nextStatus !== invoice.status) {
      invoice.statusHistory.push({ status: nextStatus, changedBy: reqUser?._id || null, changedAt: new Date() });
      invoice.status = nextStatus;
    }
    invoice.updatedBy = reqUser?._id || invoice.updatedBy;
    await invoice.save();
    return invoice;
  }

  static async getPDF(invoiceId, { reqUser, ipAddress } = {}) {
    const invoice = await this.findInvoice(invoiceId, { populate: true });
    const settings = await Setting.getSettings();
    const pdfBuffer = await generateInvoicePDF(invoice, settings);
    await ActivityLoggerService.log({ user: reqUser?._id, action: 'PDF_GENERATED', entity: 'Invoice', entityId: invoice._id, meta: { invoiceNumber: invoice.invoiceNumber }, ipAddress });
    return { pdfBuffer, invoiceNumber: invoice.invoiceNumber };
  }

  static async sendInvoiceEmail({ invoiceId, data = {}, reqUser, ipAddress }) {
    const invoice = await this.findInvoice(invoiceId, { populate: true });
    const client = invoice.clientId;
    if (!client?.email) throw createError('Client does not have an email address.', 400);
    const settings = await Setting.getSettings();
    const pdfBuffer = await generateInvoicePDF(invoice, settings);
    try {
      await mailerService.sendInvoiceEmail({
        to: client.email,
        cc: data.cc,
        subject: data.subject,
        message: data.message,
        clientName: client.contactPerson || client.companyName,
        invoiceNumber: invoice.invoiceNumber,
        pdfBuffer,
        companyName: settings.companyName
      });
    } catch (_error) {
      throw createError('Unable to send invoice email. Check the mail service configuration and try again.', 502);
    }
    await ActivityLoggerService.log({ user: reqUser._id, action: 'SEND_EMAIL', entity: 'Invoice', entityId: invoice._id, meta: { to: client.email, invoiceNumber: invoice.invoiceNumber }, ipAddress });
    return { message: `Invoice emailed to ${client.email}.`, invoice };
  }

  static async markOverdueInvoices() {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    const due = await Invoice.find({ status: { $in: ['unpaid', 'partially_paid'] }, dueDate: { $lt: cutoff } });
    let modified = 0;
    for (const invoice of due) {
      const result = await Invoice.updateOne(
        { _id: invoice._id, status: { $in: ['unpaid', 'partially_paid'] } },
        { $set: { status: 'overdue' }, $push: { statusHistory: { status: 'overdue', changedBy: null, changedAt: new Date() } } }
      );
      if (result.modifiedCount) {
        modified += 1;
        await ActivityLoggerService.log({
          action: 'STATUS_CHANGE', entity: 'Invoice', entityId: invoice._id,
          meta: { oldStatus: invoice.status, newStatus: 'overdue', invoiceNumber: invoice.invoiceNumber, source: 'overdue-cron' }
        });
      }
    }
    return modified;
  }
}

module.exports = InvoiceService;
module.exports.deriveStatus = deriveStatus;
