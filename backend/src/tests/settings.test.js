const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = require('../app');
const User = require('../models/User');
const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');
const { generateToken } = require('../middleware/auth.middleware');

describe('System Settings Module (Module 13)', () => {
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
    await Setting.deleteMany({});
    await ActivityLog.deleteMany({});

    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@officeflow.test',
      password: 'password123',
      role: 'admin',
      status: 'active'
    });
    adminToken = generateToken(adminUser);

    teamMemberUser = await User.create({
      name: 'Team Member',
      email: 'member@officeflow.test',
      password: 'password123',
      role: 'team_member',
      status: 'active'
    });
    teamMemberToken = generateToken(teamMemberUser);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Setting.deleteMany({});
    await ActivityLog.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/settings', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should allow team member to read settings (GET /api/settings)', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${teamMemberToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('companyName');
      expect(res.body.data.defaultGstRate).toBe(18);
      expect(res.body.data.defaultPaymentConditions).toContain('50% advance');
      expect(res.body.data.state).toBe('Tamil Nadu');
    });

    it('should allow admin to read settings (GET /api/settings)', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.numberingPrefixes.quotation).toBe('QT');
      expect(res.body.data.numberingPrefixes.invoice).toBe('INV');
    });
  });

  describe('PUT /api/settings (RBAC & Updates)', () => {
    it('should FAIL (403) when team member tries to update settings', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({ companyName: 'Unauthorized Update' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow admin to update settings and log activity', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Acme Technologies Pvt Ltd',
          cin: 'U72900TN2026PTC123456',
          gstin: '33AAAAA0000A1Z5',
          state: 'Karnataka',
          defaultGstRate: 18,
          defaultQuotationValidityDays: 45,
          defaultInvoiceDueDays: 30,
          bankDetails: {
            bankName: 'HDFC Bank',
            accountNumber: '50200012345678',
            ifscCode: 'HDFC0001234'
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe('Acme Technologies Pvt Ltd');
      expect(res.body.data.cin).toBe('U72900TN2026PTC123456');
      expect(res.body.data.gstin).toBe('33AAAAA0000A1Z5');
      expect(res.body.data.state).toBe('Karnataka');
      expect(res.body.data.defaultQuotationValidityDays).toBe(45);
      expect(res.body.data.bankDetails.bankName).toBe('HDFC Bank');

      // Verify activity log recorded
      const log = await ActivityLog.findOne({ action: 'UPDATE_SETTINGS' });
      expect(log).not.toBeNull();
      expect(log.entity).toBe('Setting');
    });
  });

  describe('Logo Upload & Validation', () => {
    it('should REJECT non-image file uploads (e.g. .txt or .exe)', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('logo', Buffer.from('malicious content'), 'exploit.txt');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only PNG, JPG, and WebP');
    });

    it('should ACCEPT valid image file upload (PNG)', async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('companyName', 'OfficeFlow Global')
        .attach('logo', pngBuffer, 'logo.png');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logo).toMatch(/^\/uploads\/company\/logo_[a-f0-9]+\.png$/);
    });
  });
});
