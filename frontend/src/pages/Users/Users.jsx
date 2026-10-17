import React from 'react';
import { UserCheck, Plus } from 'lucide-react';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';

export default function UsersPage() {
  const columns = [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Designation', key: 'designation' },
    { header: 'Role', key: 'role' },
    { header: 'Status', key: 'status' },
    { header: 'Actions', key: 'actions', align: 'right' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Member Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Admin-only portal to manage staff accounts, designations, and permissions</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus}>Add Team Member</Button>
      </div>

      <Table
        columns={columns}
        data={[]}
        isLoading={false}
        emptyMessage="No team members registered"
        emptySubtext="Admin can invite or provision team member logins."
        actionButton={<Button variant="outline" size="sm" icon={Plus}>Add Member</Button>}
      />
    </div>
  );
}
