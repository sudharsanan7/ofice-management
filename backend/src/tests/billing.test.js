const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Setting = require('../models/Setting');
const Counter = require('../models/Counter');
const ActivityLog = require('../models/ActivityLog');
const ExpenseService = require('../services/expense.service');
const mailerService = require('../services/mailer.service');
const { generateToken } = require('../middleware/auth.middleware');

describe('Mounted billing and operations APIs', () => {
  let admin;
  let token;
  let client;
  let receiptPath;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/officeflow_test';
    if (mongoose.connection.readyState === 0) await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}), Client.deleteMany({}), Invoice.deleteMany({}),
      Payment.deleteMany({}), Expense.deleteMany({}), Setting.deleteMany({}),
      Counter.deleteMany({}), ActivityLog.deleteMany({})
    ]);
    admin = await User.create({ name: 'Billing Admin', email: 'billing@officeflow.test', password: 'password123', role: 'admin' });
    token = generateToken(admin);
    client = await Client.create({
      companyName: 'Billing Client',
      contactPerson: 'Billing Contact',
      email: 'client@billing.test',
      billingAddress: { state: 'Tamil Nadu' },
      createdBy: admin._id
    });
    receiptPath = null;
  });

  afterEach(async () => {
    if (receiptPath) ExpenseService.removeReceiptFile(receiptPath);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('creates an invoice, records a partial payment, and rejects overpayment', async () => {
    const invoiceResponse = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        client: String(client._id),
        dueDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        items: [{ description: 'Consulting', quantity: 1, unitPrice: 1000, gstRate: 18 }]
      });
    expect(invoiceResponse.statusCode).toBe(201);
    const invoice = invoiceResponse.body.data;
    expect(invoice.grandTotal).toBe(1180);
    expect(invoice.balanceDue).toBe(1180);

    const paymentResponse = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoice: invoice._id, amount: 500, method: 'upi' });
    expect(paymentResponse.statusCode).toBe(201);

    const refreshedInvoice = await Invoice.findById(invoice._id);
    expect(refreshedInvoice.amountPaid).toBe(500);
    expect(refreshedInvoice.balanceDue).toBe(680);
    expect(refreshedInvoice.status).toBe('partially_paid');

    const excessive = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoice: invoice._id, amount: 681, method: 'upi' });
    expect(excessive.statusCode).toBe(400);
    expect(await Payment.countDocuments({ invoice: invoice._id })).toBe(1);

    const report = await request(app).get('/api/reports').set('Authorization', `Bearer ${token}`);
    expect(report.body.data.trends).toEqual(expect.arrayContaining([
      expect.objectContaining({ revenue: 500 })
    ]));
  });

  it('emails an invoice PDF and refuses edits that would invalidate recorded payments', async () => {
    const invoiceResponse = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        client: String(client._id),
        dueDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        items: [{ description: 'Consulting', quantity: 1, unitPrice: 1000, gstRate: 18 }]
      });
    const invoice = invoiceResponse.body.data;
    await request(app).post('/api/payments').set('Authorization', `Bearer ${token}`)
      .send({ invoice: invoice._id, amount: 500, method: 'upi' }).expect(201);

    const previousTransport = mailerService.transporter;
    mailerService.transporter = { sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }) };
    try {
      const emailed = await request(app).post(`/api/invoices/${invoice._id}/send`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subject: 'Your invoice' });
      expect(emailed.statusCode).toBe(200);
      expect(mailerService.transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: client.email,
        attachments: [expect.objectContaining({ contentType: 'application/pdf' })]
      }));
    } finally {
      mailerService.transporter = previousTransport;
    }

    const invalidEdit = await request(app).put(`/api/invoices/${invoice._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ description: 'Reduced amount', quantity: 1, unitPrice: 100, gstRate: 0 }] });
    expect(invalidEdit.statusCode).toBe(400);
  });

  it('stores receipts privately and serves them only through the authenticated endpoint', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'office_supplies')
      .field('description', 'Printer paper')
      .field('amount', '25.50')
      .attach('receipt', Buffer.from('%PDF-1.4\nOfficeFlow test receipt'), { filename: 'receipt.pdf', contentType: 'application/pdf' });
    expect(response.statusCode).toBe(201);
    receiptPath = response.body.data.receiptPath;

    const privateDownload = await request(app)
      .get(`/api/expenses/${response.body.data._id}/receipt`)
      .set('Authorization', `Bearer ${token}`);
    expect(privateDownload.statusCode).toBe(200);
    expect(privateDownload.headers['content-type']).toContain('application/pdf');

    const publicDownload = await request(app).get(receiptPath);
    expect(publicDownload.statusCode).toBe(404);
  });

  it('serves dashboard, report, and audit data from their authenticated routes', async () => {
    const responses = await Promise.all([
      request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/reports').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/logs').set('Authorization', `Bearer ${token}`)
    ]);
    responses.forEach((response) => expect(response.statusCode).toBe(200));
  });

  it('serves the interactive API documentation and OpenAPI specification', async () => {
    const [ui, spec] = await Promise.all([
      request(app).get('/api-docs/'),
      request(app).get('/openapi.yaml')
    ]);
    expect(ui.statusCode).toBe(200);
    expect(ui.text).toContain('swagger-ui');
    expect(spec.statusCode).toBe(200);
    expect(spec.text).toContain('/api/invoices');
  });
});
