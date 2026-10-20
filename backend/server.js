require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initCronJobs } = require('./src/config/cron');
const { ensureDefaultAdmin } = require('./src/controllers/auth.controller');

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'production') {
  for (const name of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const secret = process.env[name];
    if (!secret || secret.length < 32 || secret.includes('placeholder')) {
      throw new Error(`${name} must be configured with a unique value of at least 32 characters in production.`);
    }
  }
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 8) {
    throw new Error('ADMIN_PASSWORD must contain at least eight characters.');
  }
}

// Connect to MongoDB
connectDB().then(async () => {
  await ensureDefaultAdmin();
  initCronJobs();
  const server = app.listen(PORT, () => {
    console.log(`[OfficeFlow Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Handle Unhandled Promise Rejections
  process.on('unhandledRejection', (err) => {
    console.error(`[Process] Unhandled Rejection: ${err.message}`);
    // Close server & exit process gracefully in production
    if (process.env.NODE_ENV === 'production') {
      server.close(() => process.exit(1));
    }
  });

  // Handle Uncaught Exceptions
  process.on('uncaughtException', (err) => {
    console.error(`[Process] Uncaught Exception: ${err.message}`);
    if (process.env.NODE_ENV === 'production') {
      server.close(() => process.exit(1));
    }
  });

  // Graceful shutdown on SIGTERM / SIGINT
  const shutdown = () => {
    console.log('[Process] Gracefully shutting down server...');
    server.close(() => {
      console.log('[Process] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
