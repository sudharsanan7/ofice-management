const User = require('../models/User');
const { generateToken } = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ActivityLoggerService = require('../services/activityLogger.service');

/**
 * @desc    Log in user & get JWT token
 * @route   POST /api/auth/login
 */
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

  return successResponse(res, {
    statusCode: 201,
    message: 'Initial administrator account configured successfully.',
    data: {
      token,
      user: admin.toJSON()
    }
  });
});

module.exports = {
  login,
  setupInitialAdmin
};
