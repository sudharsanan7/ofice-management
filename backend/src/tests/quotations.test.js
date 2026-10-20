'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const mailerService = require('../services/mailer.service');
const Quotation = require('../models/Quotation');
const QuotationService = require('../services/quotation.service');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth.middleware');

// ─── helpers ────────────────────────────────────────────────────────────────
let adminToken, memberToken;
let clientId, quotationId, memberQuotationId;

const adminUser = {
  name: 'QT Admin',
  email: 'qtadmin@officeflow.test',
  password: 'Admin@12345',
};
const memberUser = {
  name: 'QT Member',
  email: 'qtmember@officeflow.test',
  password: 'Member@12345',
};

// ─── bootstrap ──────────────────────────────────────────────────────────────
beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/officeflow_test';
  if (mongoose.connection.readyState === 0) await mongoose.connect(mongoUri);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  adminUser.email = `qtadmin-${unique}@officeflow.test`;
  memberUser.email = `qtmember-${unique}@officeflow.test`;
  const admin = await User.create({ ...adminUser, role: 'admin', status: 'active' });
  const member = await User.create({ ...memberUser, role: 'team_member', status: 'active' });
  adminToken = generateToken(admin);
  memberToken = generateToken(member);

  // seed client
  const clientRes = await request(app)
    .post('/api/clients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      companyName: 'QT Test Corp',
      contactPerson: 'QT Contact',
      email: 'qtclient@example.com',
      phone: '9999900000',
      billingAddress: {
        line1: '10 QT St',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
      },
      stateCode: '33',
    });
  clientId = clientRes.body.data?._id;
}, 30000);

afterAll(async () => {
  await mongoose.connection.close();
});

// ─── sample payload ─────────────────────────────────────────────────────────
function makePayload(overrides = {}) {
  return {
    client: clientId,
    issueDate: new Date().toISOString(),
    validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    items: [
      {
        description: 'Web Development',
        sacCode: '998314',
        quantity: 10,
        unitPrice: 5000,
        discount: 1000,
        gstRate: 18,
      },
    ],
    terms: 'Net 30',
    notes: 'Thank you for your business.',
    ...overrides,
  };
}

// ─── tests ──────────────────────────────────────────────────────────────────
describe('Quotations API', () => {
  // ── CREATE ──
  describe('POST /api/quotations', () => {
    it('admin can create a quotation and server computes totals', async () => {
      const res = await request(app)
        .post('/api/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(makePayload());

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      const qt = res.body.data;
      expect(qt.quotationNumber).toMatch(/^QT\//);
      // Net line subtotal: 10 × 5000 − 1000 = 49000 (as a gross base before line discount),
      // stored subtotal is net of the flat line discount.
      expect(qt.subtotal).toBe(49000);
      expect(qt.grandTotal).toBeGreaterThan(0);
      quotationId = qt._id;
    });

    it('team member can also create a quotation', async () => {
      const res = await request(app)
        .post('/api/quotations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(makePayload());
      expect(res.statusCode).toBe(201);
      memberQuotationId = res.body.data._id;
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/quotations')
        .send(makePayload());
      expect(res.statusCode).toBe(401);
    });

    it('validates required fields (missing items)', async () => {
      const res = await request(app)
        .post('/api/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ client: clientId });
      expect(res.statusCode).toBe(400);
    });

    it('ignores client-supplied totals and assigns unique sequential numbers under parallel requests', async () => {
      const requests = Array.from({ length: 5 }, (_, index) => request(app)
        .post('/api/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(makePayload({ subtotal: 0, grandTotal: 0, cgstTotal: 0, items: [{ description: `Parallel ${index}`, quantity: 1, unitPrice: 100, discount: 0, gstRate: 18, lineTotal: 0 }] })));
      const responses = await Promise.all(requests);
      responses.forEach((res) => {
        expect(res.statusCode).toBe(201);
        expect(res.body.data.subtotal).toBe(100);
        expect(res.body.data.grandTotal).toBe(118);
      });
      const numbers = responses.map((res) => res.body.data.quotationNumber);
      expect(new Set(numbers).size).toBe(5);
    });
  });

  // ── LIST ──
  describe('GET /api/quotations', () => {
    it('returns paginated list with success true', async () => {
      const res = await request(app)
        .get('/api/quotations')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.quotations)).toBe(true);
    });

    it('filters by status', async () => {
      const res = await request(app)
        .get('/api/quotations?status=draft')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      const quotations = res.body.data.quotations;
      quotations.forEach((q) => expect(q.status).toBe('draft'));
    });
  });

  // ── GET ONE ──
  describe('GET /api/quotations/:id', () => {
    it('returns a single quotation', async () => {
      const res = await request(app)
        .get(`/api/quotations/${quotationId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(quotationId);
    });

    it('returns 400 for a malformed ObjectId', async () => {
      const res = await request(app).get('/api/quotations/not-an-object-id').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(400);
    });

    it('rejects NoSQL-style filter payloads', async () => {
      const res = await request(app).get('/api/quotations').query({ status: { $ne: 'draft' } }).set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(400);
    });
  });

  // ── UPDATE ──
  describe('PUT /api/quotations/:id', () => {
    it('can edit a draft quotation', async () => {
      const res = await request(app)
        .put(`/api/quotations/${quotationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(makePayload({ notes: 'Updated notes' }));
      expect(res.statusCode).toBe(200);
      expect(res.body.data.notes).toBe('Updated notes');
    });

    it('team member cannot update another user\'s quotation', async () => {
      const res = await request(app).put(`/api/quotations/${quotationId}`).set('Authorization', `Bearer ${memberToken}`).send({ notes: 'Unauthorized' });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── STATUS TRANSITIONS ──
  describe('PATCH /api/quotations/:id/status', () => {
    it('draft → sent is valid', async () => {
      const res = await request(app)
        .patch(`/api/quotations/${quotationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'sent' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('sent');
    });

    it('cannot edit a sent (locked) quotation', async () => {
      const res = await request(app)
        .put(`/api/quotations/${quotationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(makePayload({ notes: 'Should fail' }));
      expect(res.statusCode).toBe(400);
    });

    it('invalid transition (sent → draft) is rejected', async () => {
      const res = await request(app)
        .patch(`/api/quotations/${quotationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'draft' });
      expect(res.statusCode).toBe(400);
    });

    it('sent → accepted is valid', async () => {
      const res = await request(app)
        .patch(`/api/quotations/${quotationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'accepted' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('accepted');
    });
  });

  // ── PDF ──
  describe('GET /api/quotations/:id/pdf', () => {
    it('returns application/pdf content type', async () => {
      const res = await request(app)
        .get(`/api/quotations/${quotationId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
    });
  });

  // ── DELETE ──
  describe('DELETE /api/quotations/:id', () => {
    it('team member cannot delete a quotation', async () => {
      const res = await request(app)
        .delete(`/api/quotations/${quotationId}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('admin can delete a draft quotation', async () => {
      // create a fresh draft to delete
      const created = await request(app)
        .post('/api/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(makePayload());
      const draftId = created.body.data._id;

      const res = await request(app)
        .delete(`/api/quotations/${draftId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('team member may delete their own draft', async () => {
      const res = await request(app).delete(`/api/quotations/${memberQuotationId}`).set('Authorization', `Bearer ${memberToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('email and automatic expiry', () => {
    it('keeps a quotation as draft when SMTP delivery fails', async () => {
      const created = await request(app).post('/api/quotations').set('Authorization', `Bearer ${adminToken}`).send(makePayload());
      const sendSpy = jest.spyOn(mailerService, 'sendQuotationEmail').mockRejectedValueOnce(new Error('secret smtp detail'));
      const res = await request(app).post(`/api/quotations/${created.body.data._id}/send`).set('Authorization', `Bearer ${adminToken}`).send({ subject: 'Test' });
      expect(res.statusCode).toBe(502);
      expect(res.body.message).not.toContain('secret');
      const saved = await Quotation.findById(created.body.data._id);
      expect(saved.status).toBe('draft');
      sendSpy.mockRestore();
    });

    it('expires overdue draft and sent quotations idempotently', async () => {
      const created = await request(app).post('/api/quotations').set('Authorization', `Bearer ${adminToken}`).send(makePayload({ issueDate: new Date(Date.now() - 4 * 86400000).toISOString(), validUntil: new Date(Date.now() - 86400000).toISOString() }));
      const count = await QuotationService.expireOverdueQuotations();
      const saved = await Quotation.findById(created.body.data._id);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(saved.status).toBe('expired');
      expect(await QuotationService.expireOverdueQuotations()).toBe(0);
    });
  });
});
