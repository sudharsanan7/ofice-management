const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_officeflow';

/**
 * Generate JWT token for an authenticated user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/**
 * Middleware: Verify JWT and attach authenticated user to request
 */
const verifyToken = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication required. No authorization token provided.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'User belonging to this token no longer exists.'
      });
    }

    if (user.status === 'inactive') {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Account is deactivated. Please contact an administrator.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid authorization token.'
      });
    }
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authorization token has expired. Please log in again.'
      });
    }
    return next(err);
  }
};

module.exports = {
  generateToken,
  verifyToken
};
