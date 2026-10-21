const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const path = require('path');
const fs = require('fs');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const settingRoutes = require('./routes/setting.routes');
const clientRoutes = require('./routes/client.routes');
const quotationRoutes = require('./routes/quotation.routes');
const calendarEventRoutes = require('./routes/calendarEvent.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const paymentRoutes = require('./routes/payment.routes');
const expenseRoutes = require('./routes/expense.routes');
const reportRoutes = require('./routes/report.routes');
const activityLogRoutes = require('./routes/activityLog.routes');
const notificationRoutes = require('./routes/notification.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);

// 1. Security HTTP Headers
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// 2. CORS Configuration - Allow FRONTEND_URL, RENDER_EXTERNAL_URL, and same-origin requests
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const renderUrl = process.env.RENDER_EXTERNAL_URL;
app.use(
  cors((req, callback) => {
    const origin = req.header('Origin');
    const hostOrigin = `${req.protocol}://${req.get('host')}`;
    const isAllowed =
      !origin ||
      origin === frontendUrl ||
      origin === renderUrl ||
      origin === hostOrigin ||
      origin === 'http://localhost:5173' ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.vercel.app');

    if (isAllowed) {
      callback(null, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      });
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
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

// Publicly serve company branding only; receipts are served through authenticated routes.
app.use(
  '/uploads/company',
  express.static(path.join(__dirname, '../uploads/company'), {
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
app.use('/api/clients', clientRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/events', calendarEventRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/logs', activityLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.get('/openapi.yaml', (_req, res) => res.sendFile(path.join(__dirname, '../../docs/openapi.yaml')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, { swaggerOptions: { url: '/openapi.yaml' } }));

// Serve built React frontend when available (outside test suite)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (process.env.NODE_ENV !== 'test' && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/api-docs')) {
      return next();
    }
    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 10. 404 Route Handler
app.use(notFoundHandler);

// 11. Centralized Error Handler
app.use(errorHandler);

module.exports = app;
