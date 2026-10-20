'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const CalendarEvent = require('../models/CalendarEvent');
const { generateToken } = require('../middleware/auth.middleware');

let adminToken;
let memberToken;
let adminId;
let memberId;

beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/officeflow_test';
  if (mongoose.connection.readyState === 0) await mongoose.connect(mongoUri);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [admin, member] = await User.create([
    { name: 'Calendar Admin', email: `calendar-admin-${unique}@officeflow.test`, password: 'Admin@12345', role: 'admin' },
    { name: 'Calendar Member', email: `calendar-member-${unique}@officeflow.test`, password: 'Member@12345', role: 'team_member' }
  ]);
  adminId = admin._id;
  memberId = member._id;
  adminToken = generateToken(admin);
  memberToken = generateToken(member);
}, 30000);

afterAll(async () => {
  await CalendarEvent.deleteMany({ assignedTo: { $in: [adminId, memberId] } });
  await User.deleteMany({ _id: { $in: [adminId, memberId] } });
  await mongoose.connection.close();
});

describe('Calendar tasks API', () => {
  let eventId;

  it('allows an authenticated team member to view active assignees', async () => {
    const response = await request(app)
      .get('/api/events/assignees')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.assignees).toEqual(expect.arrayContaining([
      expect.objectContaining({ _id: memberId.toString(), name: 'Calendar Member' })
    ]));
    expect(response.body.data.assignees[0]).not.toHaveProperty('email');
  });

  it('creates, lists, updates, and deletes an assigned calendar task', async () => {
    const taskDate = new Date();
    taskDate.setDate(taskDate.getDate() + 3);
    taskDate.setHours(12, 0, 0, 0);
    const startDate = new Date(taskDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const created = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Prepare project proposal',
        description: 'Review the scope with the client.',
        date: taskDate.toISOString(),
        assignedTo: memberId.toString()
      });

    expect(created.statusCode).toBe(201);
    expect(created.body.data.assignedTo.name).toBe('Calendar Member');
    eventId = created.body.data._id;

    const listed = await request(app)
      .get('/api/events')
      .query({ startDate: startDate.toISOString(), endDate: endDate.toISOString() })
      .set('Authorization', `Bearer ${memberToken}`);
    expect(listed.statusCode).toBe(200);
    expect(listed.body.data.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ _id: eventId, title: 'Prepare project proposal' })
    ]));

    const updated = await request(app)
      .put(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'done' });
    expect(updated.statusCode).toBe(200);
    expect(updated.body.data.status).toBe('done');

    const forbiddenDelete = await request(app)
      .delete(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(forbiddenDelete.statusCode).toBe(403);

    const deleted = await request(app)
      .delete(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.statusCode).toBe(200);
  });

  it('rejects missing authentication and nonexistent assignees', async () => {
    const unauthorized = await request(app)
      .get('/api/events/assignees');
    expect(unauthorized.statusCode).toBe(401);

    const invalidAssignee = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Invalid assignment',
        date: new Date().toISOString(),
        assignedTo: new mongoose.Types.ObjectId().toString()
      });
    expect(invalidAssignee.statusCode).toBe(400);
  });

  it('creates bounded weekly recurring tasks with times and meeting details', async () => {
    const taskDate = new Date();
    taskDate.setDate(taskDate.getDate() + 2);
    taskDate.setHours(12, 0, 0, 0);
    const created = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Weekly review',
        date: taskDate.toISOString(),
        assignedTo: memberId.toString(),
        startTime: '09:30',
        endTime: '10:00',
        category: 'meeting',
        meetingUrl: 'https://meet.example.test/review',
        repeat: 'weekly',
        repeatCount: 3
      });
    expect(created.statusCode).toBe(201);
    expect(created.body.data.startTime).toBe('09:30');
    const occurrences = await CalendarEvent.find({ seriesId: created.body.data.seriesId }).sort({ date: 1 });
    expect(occurrences).toHaveLength(3);
    expect(occurrences[1].date.getTime() - occurrences[0].date.getTime()).toBe(7 * 86400000);
  });

  it('rejects an end time that is not later than the start time', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Invalid timed task',
        date: new Date().toISOString(),
        assignedTo: memberId.toString(),
        startTime: '11:00',
        endTime: '10:00'
      });
    expect(response.statusCode).toBe(400);
  });
});
