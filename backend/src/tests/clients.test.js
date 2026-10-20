const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const Quotation = require('../models/Quotation');
const ActivityLog = require('../models/ActivityLog');
const { generateToken } = require('../middleware/auth.middleware');

describe('Client Management Module (Module 6)', () => {
  let adminToken;
  let adminUser;
  let teamMemberToken;
  let teamMemberUser;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/officeflow_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Client.deleteMany({});
    await Invoice.deleteMany({});
    await Quotation.deleteMany({});
    await ActivityLog.deleteMany({});

    adminUser = await User.create({
      name: 'Admin Boss',
      email: 'admin@officeflow.test',
      password: 'password123',
      role: 'admin',
      status: 'active'
    });
    adminToken = generateToken(adminUser);

    teamMemberUser = await User.create({
      name: 'Agent Smith',
      email: 'smith@officeflow.test',
      password: 'password123',
      role: 'team_member',
      status: 'active'
    });
    teamMemberToken = generateToken(teamMemberUser);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Client.deleteMany({});
    await Invoice.deleteMany({});
    await Quotation.deleteMany({});
    await ActivityLog.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Client Creation & Validation (POST /api/clients)', () => {
    it('should allow a team member to create a client with valid GSTIN', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({
          companyName: 'Stark Industries',
          contactPerson: 'Tony Stark',
          email: 'tony@stark.test',
          phone: '+91 98888 77777',
          gstin: '33AAAAA0000A1Z5',
          billingAddress: {
            line1: '10880 Malibu Point',
            city: 'Chennai',
            state: 'Tamil Nadu',
            pincode: '600001'
          }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe('Stark Industries');
      expect(res.body.data.gstin).toBe('33AAAAA0000A1Z5');
      // Auto-derived state code from GSTIN first 2 digits
      expect(res.body.data.stateCode).toBe('33');

      // Verify activity log was created
      const log = await ActivityLog.findOne({ entity: 'Client', action: 'CREATE' });
      expect(log).not.toBeNull();
      expect(log.meta.companyName).toBe('Stark Industries');
    });

    it('should REJECT creation when GSTIN format is invalid', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({
          companyName: 'Bad GST Corp',
          contactPerson: 'Invalid GST User',
          email: 'invalid@gst.test',
          gstin: 'INVALID123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('validation failed');
    });

    it('should REJECT duplicate client email', async () => {
      await Client.create({
        companyName: 'Wayne Enterprises',
        contactPerson: 'Bruce Wayne',
        email: 'bruce@wayne.test',
        createdBy: adminUser._id
      });

      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({
          companyName: 'Wayne Copy',
          contactPerson: 'Imposter',
          email: 'bruce@wayne.test'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('Client Details, Quotations, Invoices & Financial Totals (GET /api/clients/:id)', () => {
    it('should return client details with quotations, invoices, and aggregated totals', async () => {
      const client = await Client.create({
        companyName: 'Cyberdyne Systems',
        contactPerson: 'Miles Dyson',
        email: 'miles@cyberdyne.test',
        createdBy: adminUser._id
      });

      // Create test invoice for this client
      await Invoice.create({
        invoiceNumber: 'INV/2026-27/0001',
        clientId: client._id,
        items: [{ description: 'AI Research Consultation', quantity: 1, unitPrice: 100000, amount: 100000 }],
        subtotal: 100000,
        totalAmount: 118000,
        amountPaid: 50000,
        balanceDue: 68000,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'partially_paid',
        createdBy: adminUser._id
      });

      // Create test quotation for this client
      await Quotation.create({
        quotationNumber: 'QT/2026-27/0001',
        client: client._id,
        items: [{ description: 'Skynet Neural Network Architecture', quantity: 1, unitPrice: 200000, gstRate: 18, lineSubtotal: 200000, lineTotal: 236000 }],
        subtotal: 200000,
        grandTotal: 236000,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        statusHistory: [{ status: 'draft', changedBy: adminUser._id }, { status: 'sent', changedBy: adminUser._id }],
        status: 'sent',
        createdBy: adminUser._id
      });

      const res = await request(app)
        .get(`/api/clients/${client._id}`)
        .set('Authorization', `Bearer ${teamMemberToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.client.companyName).toBe('Cyberdyne Systems');
      expect(res.body.data.invoices.length).toBe(1);
      expect(res.body.data.quotations.length).toBe(1);
      expect(res.body.data.totals.totalBilled).toBe(118000);
      expect(res.body.data.totals.totalPaid).toBe(50000);
      expect(res.body.data.totals.totalOutstanding).toBe(68000);
    });
  });

  describe('Deletion Guards and Archive Functionality', () => {
    it('should FAIL (403) when a team member tries to delete a client', async () => {
      const client = await Client.create({
        companyName: 'Acme Test Corp',
        contactPerson: 'Wile E. Coyote',
        email: 'wile@acme.test',
        createdBy: adminUser._id
      });

      const res = await request(app)
        .delete(`/api/clients/${client._id}`)
        .set('Authorization', `Bearer ${teamMemberToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should BLOCK deleting a client that has recorded invoices (offer archive instead)', async () => {
      const client = await Client.create({
        companyName: 'Globex Corp',
        contactPerson: 'Hank Scorpio',
        email: 'hank@globex.test',
        createdBy: adminUser._id
      });

      // Attach an invoice
      await Invoice.create({
        invoiceNumber: 'INV/2026-27/0002',
        clientId: client._id,
        items: [{ description: 'Test service', quantity: 1, unitPrice: 50000, lineSubtotal: 50000, lineTotal: 50000 }],
        totalAmount: 50000,
        grandTotal: 50000,
        balanceDue: 50000,
        dueDate: new Date(),
        createdBy: adminUser._id
      });

      // Admin attempts deletion
      const res = await request(app)
        .delete(`/api/clients/${client._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('archive this client instead');
    });

    it('should ALLOW admin to delete a client that has NO invoices', async () => {
      const client = await Client.create({
        companyName: 'No Invoice Corp',
        contactPerson: 'Fresh Lead',
        email: 'fresh@lead.test',
        createdBy: adminUser._id
      });

      const res = await request(app)
        .delete(`/api/clients/${client._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const inDb = await Client.findById(client._id);
      expect(inDb).toBeNull();
    });

    it('should allow archiving a client via status patch', async () => {
      const client = await Client.create({
        companyName: 'Oscorp Industries',
        contactPerson: 'Norman Osborn',
        email: 'norman@oscorp.test',
        createdBy: adminUser._id
      });

      const res = await request(app)
        .patch(`/api/clients/${client._id}/status`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({ status: 'archived' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('archived');
    });
  });

  describe('Client Activity History (GET /api/clients/:id/activity)', () => {
    it('should return activity trail for client', async () => {
      const client = await Client.create({
        companyName: 'Umbrella Corp',
        contactPerson: 'Albert Wesker',
        email: 'wesker@umbrella.test',
        createdBy: adminUser._id
      });

      await ActivityLog.create({
        user: adminUser._id,
        action: 'UPDATE',
        entity: 'Client',
        entityId: client._id,
        meta: { updatedFields: ['phone'] }
      });

      const res = await request(app)
        .get(`/api/clients/${client._id}/activity`)
        .set('Authorization', `Bearer ${teamMemberToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].action).toBe('UPDATE');
    });
  });
});
