const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth.middleware');

describe('User Management and RBAC (Modules 3 & 4)', () => {
  let adminUser;
  let adminToken;
  let teamMemberUser;
  let teamMemberToken;
  let secondUser;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/officeflow_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  beforeEach(async () => {
    // Clean collections before each test
    await User.deleteMany({});

    // Create Admin
    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@officeflow.test',
      password: 'password123',
      role: 'admin',
      status: 'active',
      designation: 'Managing Director'
    });
    adminToken = generateToken(adminUser);

    // Create Team Member
    teamMemberUser = await User.create({
      name: 'John Developer',
      email: 'john@officeflow.test',
      password: 'password123',
      role: 'team_member',
      status: 'active',
      designation: 'Software Engineer'
    });
    teamMemberToken = generateToken(teamMemberUser);

    // Create a second team member
    secondUser = await User.create({
      name: 'Alice Designer',
      email: 'alice@officeflow.test',
      password: 'password123',
      role: 'team_member',
      status: 'active',
      designation: 'UI Designer'
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('RBAC & Permission Enforcement on Team Members', () => {
    it('should FAIL (403) when team member tries to call GET /api/users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${teamMemberToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('should FAIL (403) when team member tries to create a new user/admin', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({
          name: 'Hacker Admin',
          email: 'hacker@officeflow.test',
          role: 'admin'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should FAIL (403) when team member tries to deactivate someone via PATCH /api/users/:id/status', async () => {
      const res = await request(app)
        .patch(`/api/users/${secondUser._id}/status`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({ status: 'inactive' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should IGNORE role and status changes when team member attempts mass assignment in PATCH /api/users/me', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({
          name: 'John Promoted',
          phone: '+91 99999 88888',
          role: 'admin',      // Malicious attempt to elevate role
          status: 'inactive', // Malicious attempt to tamper status
          email: 'newemail@officeflow.test' // Malicious attempt to change email
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('John Promoted');
      expect(res.body.data.phone).toBe('+91 99999 88888');
      // Role and email must remain unchanged
      expect(res.body.data.role).toBe('team_member');
      expect(res.body.data.email).toBe('john@officeflow.test');

      // Verify directly in DB
      const updatedInDb = await User.findById(teamMemberUser._id);
      expect(updatedInDb.role).toBe('team_member');
      expect(updatedInDb.status).toBe('active');
    });
  });

  describe('Admin Protections (Self-deactivation & Last Active Admin)', () => {
    it('should FAIL (400) when an admin attempts to deactivate themselves', async () => {
      const res = await request(app)
        .patch(`/api/users/${adminUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('cannot deactivate your own account');
    });

    it('should FAIL (400) when an admin attempts to demote themselves', async () => {
      const res = await request(app)
        .put(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'team_member' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('cannot demote yourself');
    });

    it('should FAIL (400) when attempting to deactivate the last active admin', async () => {
      // Create a second admin to perform the action
      const secondAdmin = await User.create({
        name: 'Second Admin',
        email: 'admin2@officeflow.test',
        password: 'password123',
        role: 'admin',
        status: 'active'
      });
      const secondAdminToken = generateToken(secondAdmin);

      // Second admin deactivates first admin -> allowed since 2 admins exist
      const res1 = await request(app)
        .patch(`/api/users/${adminUser._id}/status`)
        .set('Authorization', `Bearer ${secondAdminToken}`)
        .send({ status: 'inactive' });
      expect(res1.statusCode).toBe(200);

      // Now only 1 active admin exists (secondAdmin).
      // Attempting to deactivate secondAdmin must fail!
      const res2 = await request(app)
        .patch(`/api/users/${secondAdmin._id}/status`)
        .set('Authorization', `Bearer ${secondAdminToken}`)
        .send({ status: 'inactive' });
      expect(res2.statusCode).toBe(400);
      expect(res2.body.message).toContain('cannot deactivate your own account');
    });
  });

  describe('Admin User Management Operations', () => {
    it('should allow admin to list users with search and pagination', async () => {
      const res = await request(app)
        .get('/api/users?search=John&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBe(1);
      expect(res.body.data.users[0].name).toBe('John Developer');
    });

    it('should allow admin to create a team member (role forced to team_member by default)', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sarah Connor',
          email: 'sarah@officeflow.test',
          phone: '+91 91234 56789',
          designation: 'Project Lead'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('team_member');
      expect(res.body.data.email).toBe('sarah@officeflow.test');
    });

    it('should allow admin to explicitly create another admin', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Co Admin',
          email: 'coadmin@officeflow.test',
          role: 'admin',
          designation: 'Co-Director'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('admin');
    });

    it('should allow admin to update a team member status to inactive', async () => {
      const res = await request(app)
        .patch(`/api/users/${secondUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('inactive');
    });
  });

  describe('Password Management (/api/users/me/password)', () => {
    it('should FAIL (400) if current password is incorrect', async () => {
      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({
          currentPassword: 'wrong_password',
          newPassword: 'newSecretPassword123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Current password does not match');
    });

    it('should succeed when current password is valid and hash new password', async () => {
      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newSecretPassword123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify that user can authenticate with the new password
      const updatedUser = await User.findById(teamMemberUser._id).select('+password');
      const isMatch = await updatedUser.comparePassword('newSecretPassword123');
      expect(isMatch).toBe(true);
    });
  });
});
