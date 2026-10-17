import React from 'react';
import { CreditCard, Plus } from 'lucide-react';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';

export default function PaymentsPage() {
  const columns = [
    { header: 'Payment #', key: 'paymentNumber' },
    { header: 'Invoice #', key: 'invoiceNumber' },
    { header: 'Client', key: 'client' },
    { header: 'Date', key: 'paymentDate' },
    { header: 'Method', key: 'paymentMethod' },
    { header: 'Amount (INR)', key: 'amount' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment Records</h1>
          <p className="text-sm text-slate-500 mt-0.5">Record customer payments and view transaction histories</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus}>Record Payment</Button>
      </div>

      <Table
        columns={columns}
        data={[]}
        isLoading={false}
        emptyMessage="No payment records found"
        emptySubtext="Record incoming payments (UPI, bank transfer, cheque, cash) against issued invoices."
        actionButton={<Button variant="outline" size="sm" icon={Plus}>Record First Payment</Button>}
      />
    </div>
  );
}
