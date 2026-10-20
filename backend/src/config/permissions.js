/**
 * Central Permissions Matrix for OfficeFlow
 * Defines accessible actions per role across modules
 */

const PERMISSIONS = {
  admin: {
    users: ['create', 'read', 'update', 'delete', 'manage_status', 'read_profile', 'update_profile'],
    clients: ['create', 'read', 'update', 'delete'],
    quotations: ['create', 'read', 'update', 'delete', 'send'],
    invoices: ['create', 'read', 'update', 'delete', 'send'],
    payments: ['create', 'read', 'update', 'delete'],
    expenses: ['create', 'read', 'update', 'delete'],
    events: ['create', 'read', 'update', 'delete'],
    reports: ['read', 'export'],
    settings: ['read', 'update'],
    logs: ['read']
  },
  team_member: {
    users: ['read_profile', 'update_profile'],
    clients: ['create', 'read', 'update'],
    quotations: ['create', 'read', 'update', 'delete', 'send'],
    invoices: ['create', 'read', 'send'],
    payments: ['create', 'read'],
    expenses: ['create', 'read', 'update'],
    events: ['create', 'read', 'update'],
    reports: ['read', 'export'],
    settings: ['read'],
    logs: []
  }
};

/**
 * Check if a role possesses the permission for a module and action
 * @param {string} role - 'admin' | 'team_member'
 * @param {string} moduleName - Module name (e.g. 'users', 'clients')
 * @param {string} action - Action name (e.g. 'create', 'read', 'manage_status')
 * @returns {boolean}
 */
const hasPermission = (role, moduleName, action) => {
  if (!role || !PERMISSIONS[role]) {
    return false;
  }

  const modulePerms = PERMISSIONS[role][moduleName];
  if (!modulePerms || !Array.isArray(modulePerms)) {
    return false;
  }

  return modulePerms.includes(action);
};

module.exports = {
  PERMISSIONS,
  hasPermission
};
