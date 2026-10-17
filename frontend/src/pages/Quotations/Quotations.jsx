import React from 'react';
import { FileSpreadsheet, Plus } from 'lucide-react';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';

export default function QuotationsPage() {
  const columns = [
    { header: 'Quote #', key: 'quotationNumber' },
    { header: 'Client', key: 'client' },
    { header: 'Valid Until', key: 'validUntil' },
    { header: 'Total (INR)', key: 'totalAmount' },
    { header: 'Status', key: 'status' },
    { header: 'Actions', key: 'actions', align: 'right' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quotation Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate estimates, PDF quotations, email clients, and convert to invoices</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus}>Create Quotation</Button>
      </div>

      <Table
        columns={columns}
        data={[]}
        isLoading={false}
        emptyMessage="No quotations created yet"
        emptySubtext="Draft new quotations with automatic sequential numbers (e.g. QT/2026-27/0001)."
        actionButton={<Button variant="outline" size="sm" icon={Plus}>Create First Quotation</Button>}
      />
    </div>
  );
}
