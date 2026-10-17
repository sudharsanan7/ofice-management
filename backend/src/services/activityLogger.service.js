const ActivityLog = require('../models/ActivityLog');

/**
 * Activity Logger Service
 * Records audit logs across modules:
 * user, action, entity, entityId, meta, timestamp
 */
class ActivityLoggerService {
  /**
   * Log an activity
   * @param {Object} params
   * @param {string|Object} [params.user] - User ID who performed the action
   * @param {string} params.action - e.g. 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'CONVERT'
   * @param {string} params.entity - e.g. 'Client', 'Quotation', 'Invoice', 'Payment'
   * @param {string} [params.entityId] - ID of the entity acted on
   * @param {Object} [params.meta] - Additional details/metadata
   * @param {string} [params.ipAddress] - IP address of the client
   */
  static async log({ user = null, action, entity, entityId = null, meta = {}, ipAddress = null }) {
    try {
      if (!action || !entity) {
        console.warn('[ActivityLogger] Warning: action and entity are required to log an activity.');
        return null;
      }

      const logEntry = await ActivityLog.create({
        user: user || null,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        meta,
        ipAddress,
        timestamp: new Date()
      });

      return logEntry;
    } catch (err) {
      // Failure to write an audit log should never crash the main application request
      console.error('[ActivityLogger] Failed to write activity log:', err.message);
      return null;
    }
  }

  /**
   * Fetch recent activity logs with pagination and filters
   */
  static async getLogs({ page = 1, limit = 50, entity, user } = {}) {
    const query = {};
    if (entity) query.entity = entity;
    if (user) query.user = user;

    const skip = (Math.max(1, page) - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email designation role')
        .lean(),
      ActivityLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = ActivityLoggerService;
