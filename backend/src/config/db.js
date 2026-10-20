const mongoose = require('mongoose');

const DEFAULT_DB_NAME = 'officeflow';

const getMongoConnectionCandidates = () => {
  const configuredURI = process.env.MONGO_URI;

  if (configuredURI) {
    return [
      configuredURI,
      configuredURI.replace('localhost', '127.0.0.1'),
      `mongodb://127.0.0.1:27017/${DEFAULT_DB_NAME}`,
      `mongodb://localhost:27017/${DEFAULT_DB_NAME}`
    ].filter((uri, index, arr) => arr.indexOf(uri) === index);
  }

  return [
    `mongodb://127.0.0.1:27017/${DEFAULT_DB_NAME}`,
    `mongodb://localhost:27017/${DEFAULT_DB_NAME}`
  ];
};

const connectDB = async () => {
  let lastError = null;

  for (const mongoURI of getMongoConnectionCandidates()) {
    try {
      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: true
      });
      console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (error) {
      lastError = error;
      console.warn(`[MongoDB] Failed to connect to ${mongoURI}: ${error.message}`);
    }
  }

  console.error(`[MongoDB] Connection error: ${lastError ? lastError.message : 'Unknown MongoDB connection failure'}`);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  return null;
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Runtime error:', err.message);
});

module.exports = connectDB;
module.exports.getMongoConnectionCandidates = getMongoConnectionCandidates;
