const crypto = require('crypto');
const User = require('../models/User');
const mailerService = require('./mailer.service');
const ActivityLoggerService = require('./activityLogger.service');

class UserService {
  /**
   * Create a new team member
   * Rule: role is ALWAYS forced to team_member unless caller is admin explicitly creating another admin
   */
  static async createUser({ data, creatorUser, ipAddress }) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      const error = new Error('A user with this email address already exists.');
      error.statusCode = 409;
      error.errors = [{ field: 'email', message: 'Email is already registered' }];
      throw error;
    }

    // Role enforcement: Forced to 'team_member' unless creator is explicitly an admin creating an admin
    let assignedRole = 'team_member';
    if (creatorUser && creatorUser.role === 'admin' && data.role === 'admin') {
      assignedRole = 'admin';
    }

    // Generate a secure one-time invitation token and temporary random password
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const tempPassword = crypto.randomBytes(8).toString('base64');

    const newUser = new User({
      name: data.name,
      email: data.email.toLowerCase(),
      password: tempPassword, // Will be hashed by pre-save hook
      phone: data.phone || '',
      designation: data.designation || 'Team Member',
      role: assignedRole,
      status: 'active',
      invitationToken,
      invitationExpires: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    });

    await newUser.save();

    // Dispatch welcome email
    await mailerService.sendWelcomeEmail({
      to: newUser.email,
      name: newUser.name,
      token: invitationToken,
      tempPassword
    });

    // Record activity audit log
    await ActivityLoggerService.log({
      user: creatorUser ? creatorUser._id : null,
      action: 'CREATE',
      entity: 'User',
      entityId: newUser._id,
      meta: { email: newUser.email, role: newUser.role, designation: newUser.designation },
      ipAddress
    });

    return newUser.toJSON();
  }

  /**
   * List users with search, filtering, and pagination
   */
  static async getUsers({ page = 1, limit = 10, search, status, role }) {
    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { designation: searchRegex }
      ];
    }

    if (status) query.status = status;
    if (role) query.role = role;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query)
    ]);

    return {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get single user by ID
   */
  static async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }
    return user;
  }

  /**
   * Update user details (Admin only)
   * Enforces demotion and last active admin protection
   */
  static async updateUser({ userId, data, reqUser, ipAddress }) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    // Protection 1: Admin cannot demote themselves
    if (reqUser._id.toString() === user._id.toString() && data.role && data.role !== 'admin') {
      const error = new Error('You cannot demote yourself from the Administrator role.');
      error.statusCode = 400;
      throw error;
    }

    // Protection 2: The last active admin cannot be demoted
    if (user.role === 'admin' && data.role === 'team_member') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      if (activeAdminCount <= 1) {
        const error = new Error('Cannot demote the last active Administrator in the system.');
        error.statusCode = 400;
        throw error;
      }
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.designation !== undefined) user.designation = data.designation;
    if (data.role !== undefined) user.role = data.role;

    await user.save();

    await ActivityLoggerService.log({
      user: reqUser._id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user._id,
      meta: { updatedFields: Object.keys(data) },
      ipAddress
    });

    return user.toJSON();
  }

  /**
   * Update user status (Active / Inactive)
   * Enforces self-deactivation and last active admin protection
   */
  static async updateStatus({ userId, status, reqUser, ipAddress }) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    // Protection 1: An admin cannot deactivate themselves
    if (reqUser._id.toString() === user._id.toString() && status === 'inactive') {
      const error = new Error('You cannot deactivate your own account.');
      error.statusCode = 400;
      throw error;
    }

    // Protection 2: The last active admin cannot be deactivated
    if (user.role === 'admin' && status === 'inactive') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      if (activeAdminCount <= 1) {
        const error = new Error('Cannot deactivate the last active Administrator in the system.');
        error.statusCode = 400;
        throw error;
      }
    }

    user.status = status;
    await user.save();

    await ActivityLoggerService.log({
      user: reqUser._id,
      action: 'STATUS_CHANGE',
      entity: 'User',
      entityId: user._id,
      meta: { newStatus: status },
      ipAddress
    });

    return user.toJSON();
  }

  /**
   * Update logged-in user profile
   * Whitelist only: name, phone, designation, avatar
   * Strictly ignores role, status, email, password changes via mass assignment
   */
  static async updateProfile({ reqUser, data, ipAddress }) {
    const user = await User.findById(reqUser._id);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    // Whitelist allowed fields only
    if (data.name !== undefined) user.name = data.name;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.designation !== undefined) user.designation = data.designation;
    if (data.avatar !== undefined) user.avatar = data.avatar;

    await user.save();

    await ActivityLoggerService.log({
      user: user._id,
      action: 'UPDATE_PROFILE',
      entity: 'User',
      entityId: user._id,
      meta: { fields: Object.keys(data) },
      ipAddress
    });

    return user.toJSON();
  }

  /**
   * Update logged-in user password
   * Requires valid current password
   */
  static async updatePassword({ reqUser, currentPassword, newPassword, ipAddress }) {
    const user = await User.findById(reqUser._id).select('+password');
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      const error = new Error('Current password does not match.');
      error.statusCode = 400;
      error.errors = [{ field: 'currentPassword', message: 'Incorrect current password' }];
      throw error;
    }

    user.password = newPassword; // Pre-save hook will hash it
    await user.save();

    await ActivityLoggerService.log({
      user: user._id,
      action: 'UPDATE_PASSWORD',
      entity: 'User',
      entityId: user._id,
      meta: { message: 'Password updated successfully' },
      ipAddress
    });

    return { message: 'Password updated successfully' };
  }
}

module.exports = UserService;
