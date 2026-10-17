require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().then(() => {
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
