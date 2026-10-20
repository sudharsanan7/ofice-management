const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');
const app = require('../app');
const User = require('../models/User');
const { hashToken } = require('../middleware/auth.middleware');

describe('Authentication and session lifecycle', () => {
  let user;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/officeflow_test';
    if (mongoose.connection.readyState === 0) await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    user = await User.create({
      name: 'OfficeFlow Admin',
      email: 'auth@officeflow.test',
      password: 'password123',
      role: 'admin',
      status: 'active'
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it('validates login, issues access and refresh tokens, and rotates refresh tokens', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ email: user.email, password: 'password123' });
    expect(login.statusCode).toBe(200);
    expect(login.body.data.token).toBeTruthy();
    expect(login.headers['set-cookie'][0]).toContain('refreshToken=');

    const refresh = await agent.post('/api/auth/refresh').send({});
    expect(refresh.statusCode).toBe(200);
    expect(refresh.body.data.token).toBeTruthy();

    const logout = await agent.post('/api/auth/logout').send({});
    expect(logout.statusCode).toBe(200);
    const afterLogout = await agent.post('/api/auth/refresh').send({});
    expect(afterLogout.statusCode).toBe(401);
  });

  it('rejects invalid credentials and malformed login input', async () => {
    const invalid = await request(app).post('/api/auth/login').send({ email: user.email, password: 'incorrect' });
    expect(invalid.statusCode).toBe(401);
    const malformed = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'short' });
    expect(malformed.statusCode).toBe(400);
  });

  it('only allows login through the selected account type', async () => {
    const employee = await User.create({
      name: 'OfficeFlow Employee',
      email: 'employee@officeflow.test',
      password: 'password123',
      role: 'team_member',
      status: 'active'
    });

    const wrongAdminType = await request(app)
      .post('/api/auth/login')
      .send({ email: employee.email, password: 'password123', role: 'admin' });
    expect(wrongAdminType.statusCode).toBe(403);

    const wrongEmployeeType = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password123', role: 'team_member' });
    expect(wrongEmployeeType.statusCode).toBe(403);

    const correctType = await request(app)
      .post('/api/auth/login')
      .send({ email: employee.email, password: 'password123', role: 'team_member' });
    expect(correctType.statusCode).toBe(200);
    expect(correctType.body.data.user.role).toBe('team_member');
  });

  it('accepts a valid one-time password reset token and invalidates it afterward', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(token);
    user.resetPasswordExpires = new Date(Date.now() + 60_000);
    await user.save();

    const result = await request(app).post('/api/auth/reset-password').send({ token, password: 'newpassword123' });
    expect(result.statusCode).toBe(200);
    expect(result.body.success).toBe(true);

    const invalidated = await request(app).post('/api/auth/reset-password').send({ token, password: 'anotherpassword' });
    expect(invalidated.statusCode).toBe(400);
    const updatedUser = await User.findById(user._id).select('+password');
    expect(await updatedUser.comparePassword('newpassword123')).toBe(true);
  });
});
