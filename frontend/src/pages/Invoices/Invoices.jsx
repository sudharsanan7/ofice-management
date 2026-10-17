import React from 'react';
import { Receipt, Plus } from 'lucide-react';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';

export default function InvoicesPage() {
  const columns = [
    { header: 'Invoice #', key: 'invoiceNumber' },
    { header: 'Client', key: 'client' },
    { header: 'Due Date', key: 'dueDate' },
    { header: 'Total (INR)', key: 'totalAmount' },
    { header: 'Balance Due', key: 'balanceDue' },
    { header: 'Status', key: 'status' },
    { header: 'Actions', key: 'actions', align: 'right' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices & Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track paid, unpaid, partially paid, and overdue client invoices</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus}>Create Invoice</Button>
      </div>

      <Table
        columns={columns}
        data={[]}
        isLoading={false}
        emptyMessage="No invoices generated yet"
        emptySubtext="Create an invoice from scratch or convert an accepted quotation."
        actionButton={<Button variant="outline" size="sm" icon={Plus}>Create First Invoice</Button>}
      />
    </div>
  );
}
