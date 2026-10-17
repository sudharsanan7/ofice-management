const UserService = require('../services/user.service');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create new user (admin only)
 * @route   POST /api/users
 */
const createUser = asyncHandler(async (req, res) => {
  const user = await UserService.createUser({
    data: req.body,
    creatorUser: req.user,
    ipAddress: req.ip
  });

  return successResponse(res, {
    statusCode: 201,
    message: 'User created successfully. Welcome instructions have been dispatched.',
    data: user
  });
});

/**
 * @desc    Get all users with search, filter, pagination
 * @route   GET /api/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const result = await UserService.getUsers(req.query);

  return successResponse(res, {
    message: 'Users retrieved successfully',
    data: result
  });
});

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await UserService.getUserById(req.params.id);

  return successResponse(res, {
    message: 'User retrieved successfully',
    data: user
  });
});

/**
 * @desc    Update user details (admin only)
 * @route   PUT /api/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await UserService.updateUser({
    userId: req.params.id,
    data: req.body,
    reqUser: req.user,
    ipAddress: req.ip
  });

  return successResponse(res, {
    message: 'User updated successfully',
    data: user
  });
});

/**
 * @desc    Update user status (activate / deactivate)
 * @route   PATCH /api/users/:id/status
 */
const updateStatus = asyncHandler(async (req, res) => {
  const user = await UserService.updateStatus({
    userId: req.params.id,
    status: req.body.status,
    reqUser: req.user,
    ipAddress: req.ip
  });

  return successResponse(res, {
    message: `User status successfully updated to ${req.body.status}`,
    data: user
  });
});

/**
 * @desc    Get logged in user profile
 * @route   GET /api/users/me
 */
const getProfile = asyncHandler(async (req, res) => {
  return successResponse(res, {
    message: 'Profile retrieved successfully',
    data: req.user
  });
});

/**
 * @desc    Update logged in user profile
 * @route   PATCH /api/users/me
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await UserService.updateProfile({
    reqUser: req.user,
    data: req.body,
    ipAddress: req.ip
  });

  return successResponse(res, {
    message: 'Profile updated successfully',
    data: user
  });
});

/**
 * @desc    Update logged in user password
 * @route   PATCH /api/users/me/password
 */
const updatePassword = asyncHandler(async (req, res) => {
  const result = await UserService.updatePassword({
    reqUser: req.user,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
    ipAddress: req.ip
  });

  return successResponse(res, {
    message: result.message,
    data: null
  });
});

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateStatus,
  getProfile,
  updateProfile,
  updatePassword
};
