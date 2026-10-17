import React from 'react';
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import Button from '../../components/common/Button';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Financial summaries, conversion rates, and Excel/PDF exports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={FileSpreadsheet}>Export to Excel</Button>
          <Button variant="primary" size="sm" icon={Download}>Export PDF Summary</Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-800">Analytics Engine Ready</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Recharts interactive graphs, revenue vs expense trends, and ExcelJS reports will be connected in Phase 10.
        </p>
      </div>
    </div>
  );
}
