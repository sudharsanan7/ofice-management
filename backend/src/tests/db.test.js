const { getMongoConnectionCandidates } = require('../config/db');

describe('MongoDB connection configuration', () => {
  it('should prefer IPv4 localhost for local development when localhost resolves to IPv6', () => {
    const candidates = getMongoConnectionCandidates();

    expect(candidates).toEqual(
      expect.arrayContaining(['mongodb://127.0.0.1:27017/officeflow', 'mongodb://localhost:27017/officeflow'])
    );
    expect(candidates[0]).toBe('mongodb://127.0.0.1:27017/officeflow');
  });
});
