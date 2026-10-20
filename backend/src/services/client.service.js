const Client = require('../models/Client');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const ActivityLog = require('../models/ActivityLog');
const ActivityLoggerService = require('./activityLogger.service');

class ClientService {
  /**
   * Create a new client
   */
  static async createClient({ data, reqUser, ipAddress }) {
    // Check if email already registered for another client
    const existing = await Client.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      const error = new Error('A client with this email address already exists.');
      error.statusCode = 409;
      error.errors = [{ field: 'email', message: 'Email is already associated with another client' }];
      throw error;
    }

    // Auto-extract stateCode if GSTIN is present
    let stateCode = data.stateCode || '';
    if (!stateCode && data.gstin && data.gstin.length >= 2) {
      stateCode = data.gstin.substring(0, 2);
    }

    const client = new Client({
      ...data,
      email: data.email.toLowerCase(),
      stateCode,
      createdBy: reqUser._id
    });

    await client.save();

    await ActivityLoggerService.log({
      user: reqUser._id,
      action: 'CREATE',
      entity: 'Client',
      entityId: client._id,
      meta: {
        companyName: client.companyName,
        contactPerson: client.contactPerson,
        gstin: client.gstin
      },
      ipAddress
    });

    return client;
  }

  /**
   * List clients with search, status filter, and pagination
   */
  static async getClients({ page = 1, limit = 10, search, status = 'active' }) {
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { companyName: searchRegex },
        { contactPerson: searchRegex },
        { email: searchRegex },
        { gstin: searchRegex },
        { phone: searchRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [clients, total] = await Promise.all([
      Client.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'name email')
        .lean(),
      Client.countDocuments(query)
    ]);

    return {
      clients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get single client details along with their quotations, invoices, and financial totals
   */
  static async getClientDetails(clientId) {
    const client = await Client.findById(clientId).populate('createdBy', 'name email');
    if (!client) {
      const error = new Error('Client not found.');
      error.statusCode = 404;
      throw error;
    }

    // Fetch related quotations and invoices
    const [quotations, invoices] = await Promise.all([
      Quotation.find({ client: client._id }).sort({ createdAt: -1 }).lean(),
      Invoice.find({ clientId: client._id }).sort({ createdAt: -1 }).lean()
    ]);

    // Financial totals (computed on server, never trusted from client)
    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

    return {
      client,
      quotations,
      invoices,
      totals: {
        totalBilled,
        totalPaid,
        totalOutstanding
      }
    };
  }

  /**
   * Update client details
   */
  static async updateClient({ clientId, data, reqUser, ipAddress }) {
    const client = await Client.findById(clientId);
    if (!client) {
      const error = new Error('Client not found.');
      error.statusCode = 404;
      throw error;
    }

    // Check duplicate email if changed
    if (data.email && data.email.toLowerCase() !== client.email) {
      const existing = await Client.findOne({ email: data.email.toLowerCase() });
      if (existing) {
        const error = new Error('A client with this email address already exists.');
        error.statusCode = 409;
        error.errors = [{ field: 'email', message: 'Email is already associated with another client' }];
        throw error;
      }
      client.email = data.email.toLowerCase();
    }

    if (data.companyName !== undefined) client.companyName = data.companyName;
    if (data.contactPerson !== undefined) client.contactPerson = data.contactPerson;
    if (data.phone !== undefined) client.phone = data.phone;
    if (data.cin !== undefined) client.cin = data.cin;
    if (data.gstin !== undefined) {
      client.gstin = data.gstin;
      if (data.gstin && data.gstin.length >= 2) {
        client.stateCode = data.gstin.substring(0, 2);
      }
    }
    if (data.billingAddress !== undefined) {
      client.billingAddress = { ...client.billingAddress, ...data.billingAddress };
    }
    if (data.stateCode !== undefined) client.stateCode = data.stateCode;
    if (data.notes !== undefined) client.notes = data.notes;
    if (data.status !== undefined) client.status = data.status;

    await client.save();

    await ActivityLoggerService.log({
      user: reqUser._id,
      action: 'UPDATE',
      entity: 'Client',
      entityId: client._id,
      meta: { updatedFields: Object.keys(data) },
      ipAddress
    });

    return client;
  }

  /**
   * Delete client
   * RULE: Block deleting a client that has invoices (offer archive instead).
   */
  static async deleteClient({ clientId, reqUser, ipAddress }) {
    const client = await Client.findById(clientId);
    if (!client) {
      const error = new Error('Client not found.');
      error.statusCode = 404;
      throw error;
    }

    // Guard: Check if client has associated invoices
    const invoiceCount = await Invoice.countDocuments({ clientId: client._id });
    if (invoiceCount > 0) {
      const error = new Error(
        `Cannot delete client "${client.companyName}" because they have ${invoiceCount} recorded invoice(s). You can archive this client instead.`
      );
      error.statusCode = 400;
      error.errors = [
        {
          field: 'clientId',
          message: 'Client has existing invoices. Deletion is blocked; archive the client instead.'
        }
      ];
      throw error;
    }

    await Client.findByIdAndDelete(clientId);

    await ActivityLoggerService.log({
      user: reqUser._id,
      action: 'DELETE',
      entity: 'Client',
      entityId: clientId,
      meta: { companyName: client.companyName, email: client.email },
      ipAddress
    });

    return { message: 'Client deleted successfully.' };
  }

  /**
   * Archive or unarchive client
   */
  static async setClientStatus({ clientId, status, reqUser, ipAddress }) {
    const client = await Client.findById(clientId);
    if (!client) {
      const error = new Error('Client not found.');
      error.statusCode = 404;
      throw error;
    }

    client.status = status;
    await client.save();

    await ActivityLoggerService.log({
      user: reqUser._id,
      action: status === 'archived' ? 'ARCHIVE' : 'RESTORE',
      entity: 'Client',
      entityId: client._id,
      meta: { newStatus: status },
      ipAddress
    });

    return client;
  }

  /**
   * Get activity history for a client
   */
  static async getClientActivity(clientId) {
    const logs = await ActivityLog.find({
      $or: [
        { entity: 'Client', entityId: String(clientId) },
        { 'meta.clientId': String(clientId) }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('user', 'name email designation role')
      .lean();

    return logs;
  }
}

module.exports = ClientService;
