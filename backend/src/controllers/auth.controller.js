const User = require('../models/User');
const crypto = require('crypto');
const {
  generateToken, generateRefreshToken, setRefreshCookie, clearRefreshCookie,
  hashToken, JWT_REFRESH_SECRET
} = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ActivityLoggerService = require('../services/activityLogger.service');
const mailerService = require('../services/mailer.service');
const jwt = require('jsonwebtoken');

/**
 * @desc    Log in user & get JWT token
 * @route   POST /api/auth/login
 */
const ensureDefaultAdmin = async () => {
  const adminExists = await User.findOne({ role: 'admin' });
  if (adminExists) {
    return adminExists;
  }

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return null;
  if (process.env.ADMIN_PASSWORD.length < 8) {
    throw new Error('ADMIN_PASSWORD must contain at least eight characters.');
  }
  const admin = new User({
    name: process.env.ADMIN_NAME || 'System Administrator',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
    status: 'active'
  });

  await admin.save();
  return admin;
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, {
      statusCode: 400,
      message: 'Email and password are required',
      errors: [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is required' }
      ]
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Invalid email or password'
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Invalid email or password'
    });
  }

  if (req.body.role && user.role !== req.body.role) {
    return errorResponse(res, {
      statusCode: 403,
      message: req.body.role === 'admin'
        ? 'This account is not an administrator. Choose Employee Login instead.'
        : 'This account is not an employee account. Choose Admin Login instead.'
    });
  }

  if (user.status === 'inactive') {
    return errorResponse(res, {
      statusCode: 403,
      message: 'Your account is deactivated. Please contact an administrator.'
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  setRefreshCookie(res, refreshToken);

  await ActivityLoggerService.log({
    user: user._id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user._id,
    ipAddress: req.ip
  });

  return successResponse(res, {
    message: 'Login successful',
    data: {
      token,
      user: user.toJSON()
    }
  });
});

/**
 * @desc    Setup initial system administrator
 * @route   POST /api/auth/setup-admin
 */
const setupInitialAdmin = asyncHandler(async (req, res) => {
  const adminExists = await User.findOne({ role: 'admin' });
  if (adminExists) {
    return errorResponse(res, {
      statusCode: 400,
      message: 'An administrator account is already configured in the system.'
    });
  }

  const { name, email, password, phone, designation } = req.body;

  const admin = new User({
    name: name || 'System Administrator',
    email: email.toLowerCase(),
    password,
    phone: phone || '',
    designation: designation || 'Chief Executive Officer',
    role: 'admin',
    status: 'active'
  });

  await admin.save();

  const token = generateToken(admin);
  const refreshToken = generateRefreshToken(admin);
  admin.refreshTokenHash = hashToken(refreshToken);
  await admin.save();
  setRefreshCookie(res, refreshToken);

  return successResponse(res, {
    statusCode: 201,
    message: 'Initial administrator account configured successfully.',
    data: {
      token,
      user: admin.toJSON()
    }
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    clearRefreshCookie(res);
    return errorResponse(res, { statusCode: 401, message: 'Refresh token is required.' });
  }
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch (_error) {
    clearRefreshCookie(res);
    return errorResponse(res, { statusCode: 401, message: 'Refresh token is invalid or expired.' });
  }
  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user || user.status !== 'active' || user.refreshTokenHash !== hashToken(refreshToken)) {
    clearRefreshCookie(res);
    return errorResponse(res, { statusCode: 401, message: 'Refresh token is invalid or expired.' });
  }
  const nextRefreshToken = generateRefreshToken(user);
  user.refreshTokenHash = hashToken(nextRefreshToken);
  await user.save();
  setRefreshCookie(res, nextRefreshToken);
  return successResponse(res, { data: { token: generateToken(user), user: user.toJSON() } });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id).select('+refreshTokenHash');
      if (user && user.refreshTokenHash === hashToken(refreshToken)) {
        user.refreshTokenHash = '';
        await user.save();
      }
    } catch (error) {
      if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') throw error;
    }
  }
  clearRefreshCookie(res);
  return successResponse(res, { message: 'Logged out successfully.' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+resetPasswordToken +resetPasswordExpires');
  if (user && user.status === 'active') {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(token);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    try {
      await mailerService.sendPasswordResetEmail({ to: user.email, name: user.name, token });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      console.error('[Auth] Password reset email could not be sent:', error.message);
      return errorResponse(res, { statusCode: 503, message: 'Password reset email is temporarily unavailable. Please try again later.' });
    }
  }
  return successResponse(res, { message: 'If an active account exists for that email, password reset instructions have been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: hashToken(req.body.token),
    resetPasswordExpires: { $gt: new Date() }
  }).select('+resetPasswordToken +resetPasswordExpires +refreshTokenHash');
  if (!user) return errorResponse(res, { statusCode: 400, message: 'Password reset token is invalid or expired.' });
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.refreshTokenHash = '';
  await user.save();
  clearRefreshCookie(res);
  await ActivityLoggerService.log({ user: user._id, action: 'PASSWORD_RESET', entity: 'User', entityId: user._id, ipAddress: req.ip });
  return successResponse(res, { message: 'Password reset successfully. Please sign in with your new password.' });
});

module.exports = {
  login,
  setupInitialAdmin,
  ensureDefaultAdmin,
  refresh,
  logout,
  forgotPassword,
  resetPassword
};
