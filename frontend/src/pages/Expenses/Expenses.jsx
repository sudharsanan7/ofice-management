import React from 'react';
import { Wallet, Plus } from 'lucide-react';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';

export default function ExpensesPage() {
  const columns = [
    { header: 'Date', key: 'expenseDate' },
    { header: 'Category', key: 'category' },
    { header: 'Description', key: 'description' },
    { header: 'Amount (INR)', key: 'amount' },
    { header: 'Receipt', key: 'receipt' },
    { header: 'Actions', key: 'actions', align: 'right' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Tracking</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track company overhead, categorize expenses, and attach receipts</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus}>Add Expense</Button>
      </div>

      <Table
        columns={columns}
        data={[]}
        isLoading={false}
        emptyMessage="No expenses recorded"
        emptySubtext="Record utility bills, office supplies, travel, or maintenance expenses."
        actionButton={<Button variant="outline" size="sm" icon={Plus}>Add First Expense</Button>}
      />
    </div>
  );
}
