const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_officeflow';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}_refresh`;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateToken = (user) => jwt.sign(
  { id: user._id, role: user.role, email: user.email },
  JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
);

const generateRefreshToken = (user) => jwt.sign(
  { id: user._id, type: 'refresh' },
  JWT_REFRESH_SECRET,
  { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
);

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth'
});

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, refreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', { ...refreshCookieOptions(), maxAge: 0 });
};

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
      return errorResponse(res, { statusCode: 401, message: 'User belonging to this token no longer exists.' });
    }
    if (user.status === 'inactive') {
      return errorResponse(res, { statusCode: 403, message: 'Account is deactivated. Please contact an administrator.' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return errorResponse(res, { statusCode: 401, message: 'Invalid authorization token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, { statusCode: 401, message: 'Authorization token has expired. Please log in again.' });
    }
    return next(err);
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  hashToken,
  setRefreshCookie,
  clearRefreshCookie,
  JWT_REFRESH_SECRET
};
