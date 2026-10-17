import React from 'react';
import { Users2, Plus } from 'lucide-react';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';

export default function ClientsPage() {
  const columns = [
    { header: 'Company Name', key: 'companyName' },
    { header: 'Contact Person', key: 'contactPerson' },
    { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' },
    { header: 'GST Number', key: 'gstNumber' },
    { header: 'Actions', key: 'actions', align: 'right' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Client Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage customer profiles, billing information, and GST details</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus}>Add Client</Button>
      </div>

      <Table
        columns={columns}
        data={[]}
        isLoading={false}
        emptyMessage="No clients added yet"
        emptySubtext="Add your first client to start creating quotations and invoices."
        actionButton={<Button variant="outline" size="sm" icon={Plus}>Add First Client</Button>}
      />
    </div>
  );
}
