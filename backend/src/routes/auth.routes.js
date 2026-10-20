const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  login, setupInitialAdmin, refresh, logout, forgotPassword, resetPassword
} = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const schemas = require('../validators/auth.validator');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many failed sign-in attempts. Try again later.', data: null, errors: null }
});
const recoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password recovery attempts. Try again later.', data: null, errors: null }
});
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many session refresh attempts. Sign in again.', data: null, errors: null }
});

router.post('/login', loginLimiter, validate(schemas.loginSchema), login);
router.post('/setup-admin', recoveryLimiter, validate(schemas.setupAdminSchema), setupInitialAdmin);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.post('/forgot-password', recoveryLimiter, validate(schemas.forgotPasswordSchema), forgotPassword);
router.post('/reset-password', recoveryLimiter, validate(schemas.resetPasswordSchema), resetPassword);

module.exports = router;
