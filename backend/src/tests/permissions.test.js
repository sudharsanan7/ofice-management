const { hasPermission } = require('../config/permissions');

describe('Role permission matrix', () => {
  it('grants only explicitly listed permissions to administrators', () => {
    expect(hasPermission('admin', 'invoices', 'delete')).toBe(true);
    expect(hasPermission('admin', 'invoices', 'invent')).toBe(false);
    expect(hasPermission('admin', 'unknown-module', 'read')).toBe(false);
  });

  it('rejects permissions for unknown roles and modules', () => {
    expect(hasPermission('unknown', 'clients', 'read')).toBe(false);
    expect(hasPermission('team_member', 'unknown-module', 'read')).toBe(false);
    expect(hasPermission('team_member', 'payments', 'delete')).toBe(false);
  });
});
