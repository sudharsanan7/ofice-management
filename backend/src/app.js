const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const path = require('path');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const settingRoutes = require('./routes/setting.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// 1. Security HTTP Headers
app.use(helmet());

// 2. CORS Configuration - Allow only FRONTEND_URL with credentials
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matching FRONTEND_URL
      if (!origin || origin === frontendUrl || origin === 'http://localhost:5173') {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// 3. Request Logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// 4. Rate Limiter - general protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    data: null,
    errors: [{ message: 'Rate limit exceeded' }]
  }
});
app.use('/api', limiter);

// 5. Body Parsers with payload size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. Cookie Parser
app.use(cookieParser());

// 7. Data Sanitization against NoSQL query injection
app.use(mongoSanitize());

// 8. Prevent HTTP Parameter Pollution
app.use(hpp());

// 9. Static Uploads File Serving (safe headers, non-executable)
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    dotfiles: 'ignore',
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
    }
  })
);

// 10. API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingRoutes);

// 10. 404 Route Handler
app.use(notFoundHandler);

// 11. Centralized Error Handler
app.use(errorHandler);

module.exports = app;
