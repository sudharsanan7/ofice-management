const mongoose = require('mongoose');
const Quotation = require('../models/Quotation');
const Client = require('../models/Client');
const Setting = require('../models/Setting');
const { generateNumber } = require('./counter.service');
const { calculateTotals } = require('./pricing');
const { generateQuotationPDF } = require('./quotationPdf');
const mailerService = require('./mailer.service');
const ActivityLoggerService = require('./activityLogger.service');

const ALLOWED_TRANSITIONS = {
  draft: ['sent', 'expired'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: [],
  expired: []
};

const createError = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const isAdmin = (user) => user?.role === 'admin';
const sameId = (left, right) => String(left?._id || left) === String(right?._id || right);

class QuotationService {
  static async findQuotation(id, { populate = false } = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw createError('Invalid quotation ID.', 400);
    let query = Quotation.findById(id);
    if (populate) query = query.populate('client').populate('createdBy', 'name email designation').populate('statusHistory.changedBy', 'name email');
    const quotation = await query;
    if (!quotation) throw createError('Quotation not found.', 404);
    return quotation;
  }

  static async assertOwner(quotation, user) {
    if (!isAdmin(user) && !sameId(quotation.createdBy, user._id)) {
      throw createError('Forbidden: You may only manage quotations you created.', 403);
    }
  }

  static taxTypeFor(client, settings) {
    const clientState = String(client.billingAddress?.state || client.stateCode || '').trim().toLowerCase();
    const companyState = String(settings.state || '').trim().toLowerCase();
    return clientState && companyState && clientState !== companyState ? 'inter' : 'intra';
  }

  static async createQuotation({ data, reqUser, ipAddress }) {
    const client = await Client.findById(data.client);
    if (!client) throw createError('Client not found.', 404);
    const settings = await Setting.getSettings();
    const taxType = this.taxTypeFor(client, settings);
    const totals = calculateTotals(data.items, taxType);
    const quotationNumber = await generateNumber(settings.numberingPrefixes?.quotation || 'QT', new Date(data.issueDate || Date.now()));
    const quotation = await Quotation.create({
      quotationNumber,
      client: client._id,
      issueDate: data.issueDate || new Date(),
      validUntil: data.validUntil,
      items: totals.items,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      grandTotal: totals.grandTotal,
      taxType,
      terms: data.terms ?? settings.defaultQuotationTerms ?? '',
      notes: data.notes || '',
      status: 'draft',
      statusHistory: [{ status: 'draft', changedBy: reqUser._id }],
      createdBy: reqUser._id,
      updatedBy: reqUser._id
    });
    await ActivityLoggerService.log({
      user: reqUser._id, action: 'CREATE', entity: 'Quotation', entityId: quotation._id,
      meta: { quotationNumber, grandTotal: quotation.grandTotal, client: client.companyName }, ipAddress
    });
    return quotation.populate('client', 'companyName contactPerson email phone gstin cin billingAddress stateCode');
  }

  static async getQuotations(filters = {}) {
    const { page = 1, limit = 10, search, status, client, clientId, startDate, endDate, sort = '-createdAt' } = filters;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (client || clientId) query.client = client || clientId;
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    if (search?.trim()) {
      const clientIds = await Client.find({ companyName: { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }).distinct('_id');
      query.$or = [
        { quotationNumber: { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { client: { $in: clientIds } }
      ];
    }
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
    const sortField = ['createdAt', 'issueDate', 'validUntil', 'grandTotal', 'quotationNumber'].includes(String(sort).replace(/^-/, '')) ? sort : '-createdAt';
    const [quotations, total] = await Promise.all([
      Quotation.find(query).sort(sortField).skip((pageNumber - 1) * pageSize).limit(pageSize)
        .populate('client', 'companyName contactPerson email phone gstin').populate('createdBy', 'name email').lean(),
      Quotation.countDocuments(query)
    ]);
    return { quotations, pagination: { page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) }, page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  static async getQuotationById(id) { return this.findQuotation(id, { populate: true }); }

  static async updateQuotation({ quotationId, data, reqUser, ipAddress }) {
    const quotation = await this.findQuotation(quotationId);
    await this.assertOwner(quotation, reqUser);
    if (quotation.status !== 'draft') throw createError(`Quotation is locked because its status is "${quotation.status}". Only draft quotations can be modified.`, 400);
    const client = await Client.findById(data.client || quotation.client);
    if (!client) throw createError('Client not found.', 404);
    const settings = await Setting.getSettings();
    const taxType = this.taxTypeFor(client, settings);
    const totals = calculateTotals(data.items || quotation.items, taxType);
    if (data.client !== undefined) quotation.client = client._id;
    if (data.issueDate !== undefined) quotation.issueDate = data.issueDate;
    if (data.validUntil !== undefined) quotation.validUntil = data.validUntil;
    if (data.terms !== undefined) quotation.terms = data.terms;
    if (data.notes !== undefined) quotation.notes = data.notes;
    quotation.items = totals.items;
    quotation.subtotal = totals.subtotal;
    quotation.totalDiscount = totals.totalDiscount;
    quotation.cgstTotal = totals.cgstTotal;
    quotation.sgstTotal = totals.sgstTotal;
    quotation.igstTotal = totals.igstTotal;
    quotation.grandTotal = totals.grandTotal;
    quotation.taxType = taxType;
    quotation.updatedBy = reqUser._id;
    await quotation.save();
    await ActivityLoggerService.log({ user: reqUser._id, action: 'UPDATE', entity: 'Quotation', entityId: quotation._id, meta: { quotationNumber: quotation.quotationNumber }, ipAddress });
    return quotation.populate('client', 'companyName contactPerson email phone gstin cin billingAddress stateCode');
  }

  static async updateStatus({ quotationId, status, reqUser, ipAddress }) {
    const quotation = await this.findQuotation(quotationId);
    await this.assertOwner(quotation, reqUser);
    if (!ALLOWED_TRANSITIONS[quotation.status]?.includes(status)) throw createError(`Invalid status transition from "${quotation.status}" to "${status}".`, 400);
    const oldStatus = quotation.status;
    quotation.status = status;
    quotation.updatedBy = reqUser._id;
    quotation.statusHistory.push({ status, changedBy: reqUser._id, changedAt: new Date() });
    await quotation.save();
    await ActivityLoggerService.log({ user: reqUser._id, action: 'STATUS_CHANGE', entity: 'Quotation', entityId: quotation._id, meta: { oldStatus, newStatus: status, quotationNumber: quotation.quotationNumber }, ipAddress });
    return quotation;
  }

  static async deleteQuotation({ quotationId, reqUser, ipAddress }) {
    const quotation = await this.findQuotation(quotationId);
    await this.assertOwner(quotation, reqUser);
    if (quotation.status !== 'draft') throw createError('Only draft quotations can be deleted.', 400);
    if (quotation.convertedToInvoice) throw createError('Cannot delete a quotation converted to an invoice.', 400);
    await quotation.deleteOne();
    await ActivityLoggerService.log({ user: reqUser._id, action: 'DELETE', entity: 'Quotation', entityId: quotationId, meta: { quotationNumber: quotation.quotationNumber }, ipAddress });
    return { message: 'Quotation deleted successfully.' };
  }

  static async duplicateQuotation({ quotationId, reqUser, ipAddress }) {
    const source = await this.findQuotation(quotationId, { populate: true });
    const settings = await Setting.getSettings();
    const quotationNumber = await generateNumber(settings.numberingPrefixes?.quotation || 'QT');
    const copy = await Quotation.create({
      quotationNumber,
      client: source.client._id,
      issueDate: new Date(),
      validUntil: source.validUntil > new Date() ? source.validUntil : new Date(Date.now() + (settings.defaultQuotationValidityDays || 30) * 86400000),
      items: source.items.map((item) => ({ ...item.toObject(), _id: undefined })),
      subtotal: source.subtotal,
      totalDiscount: source.totalDiscount,
      cgstTotal: source.cgstTotal,
      sgstTotal: source.sgstTotal,
      igstTotal: source.igstTotal,
      grandTotal: source.grandTotal,
      taxType: source.taxType,
      terms: source.terms,
      notes: source.notes,
      status: 'draft',
      statusHistory: [{ status: 'draft', changedBy: reqUser._id }],
      createdBy: reqUser._id,
      updatedBy: reqUser._id
    });
    await ActivityLoggerService.log({ user: reqUser._id, action: 'DUPLICATE', entity: 'Quotation', entityId: copy._id, meta: { source: source.quotationNumber, quotationNumber }, ipAddress });
    return copy.populate('client', 'companyName contactPerson email phone gstin');
  }

  static async getPDF(quotationId, { reqUser, ipAddress } = {}) {
    const quotation = await this.findQuotation(quotationId, { populate: true });
    const settings = await Setting.getSettings();
    const pdfBuffer = await generateQuotationPDF(quotation, settings);
    await ActivityLoggerService.log({ user: reqUser?._id, action: 'PDF_GENERATED', entity: 'Quotation', entityId: quotation._id, meta: { quotationNumber: quotation.quotationNumber }, ipAddress });
    return { pdfBuffer, quotationNumber: quotation.quotationNumber };
  }

  static async sendQuotationEmail({ quotationId, data = {}, reqUser, ipAddress }) {
    const quotation = await this.findQuotation(quotationId, { populate: true });
    await this.assertOwner(quotation, reqUser);
    if (!quotation.client?.email) throw createError('Client does not have an email address.', 400);
    if (!['draft', 'sent'].includes(quotation.status)) throw createError('Only draft or sent quotations can be emailed.', 400);
    const settings = await Setting.getSettings();
    const pdfBuffer = await generateQuotationPDF(quotation, settings);
    await ActivityLoggerService.log({ user: reqUser._id, action: 'PDF_GENERATED', entity: 'Quotation', entityId: quotation._id, meta: { quotationNumber: quotation.quotationNumber, source: 'email' }, ipAddress });
    try {
      await mailerService.sendQuotationEmail({
        to: quotation.client.email,
        cc: data.cc,
        subject: data.subject,
        message: data.message,
        clientName: quotation.client.contactPerson || quotation.client.companyName,
        quotationNumber: quotation.quotationNumber,
        pdfBuffer,
        companyName: settings.companyName
      });
    } catch (_error) {
      throw createError('Unable to send quotation email. Check the mail service configuration and try again.', 502);
    }
    if (quotation.status === 'draft') {
      quotation.status = 'sent';
      quotation.statusHistory.push({ status: 'sent', changedBy: reqUser._id, changedAt: new Date() });
      quotation.updatedBy = reqUser._id;
      await quotation.save();
    }
    await ActivityLoggerService.log({ user: reqUser._id, action: 'SEND_EMAIL', entity: 'Quotation', entityId: quotation._id, meta: { to: quotation.client.email, cc: data.cc || null, quotationNumber: quotation.quotationNumber }, ipAddress });
    return { message: `Quotation emailed to ${quotation.client.email}.`, quotation };
  }

  static async getSummary() {
    const grouped = await Quotation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$grandTotal' } } }]);
    const summary = Object.fromEntries(['draft', 'sent', 'accepted', 'rejected', 'expired'].map((status) => [status, { count: 0, total: 0 }]));
    grouped.forEach((row) => { summary[row._id] = { count: row.count, total: row.total }; });
    return summary;
  }

  static async expireOverdueQuotations() {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    const due = await Quotation.find({ status: { $in: ['draft', 'sent'] }, validUntil: { $lt: cutoff } });
    let modified = 0;
    for (const quotation of due) {
      const result = await Quotation.updateOne(
        { _id: quotation._id, status: { $in: ['draft', 'sent'] }, validUntil: { $lt: cutoff } },
        { $set: { status: 'expired' }, $push: { statusHistory: { status: 'expired', changedBy: null, changedAt: new Date() } } }
      );
      if (result.modifiedCount) {
        modified += 1;
        await ActivityLoggerService.log({ action: 'STATUS_CHANGE', entity: 'Quotation', entityId: quotation._id, meta: { oldStatus: quotation.status, newStatus: 'expired', quotationNumber: quotation.quotationNumber, source: 'expiry-cron' } });
      }
    }
    return modified;
  }
}

module.exports = QuotationService;
