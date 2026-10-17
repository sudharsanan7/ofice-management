import React from 'react';
import { Users2, FileSpreadsheet, Receipt, CreditCard, ArrowUpRight, Plus, Sparkles } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function Dashboard() {
  const statCards = [
    { title: 'Total Clients', value: '0', change: '+0% this month', icon: Users2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Active Quotations', value: '0', change: '0 pending', icon: FileSpreadsheet, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Total Invoices', value: '0', change: '₹0 outstanding', icon: Receipt, color: 'text-sky-600', bg: 'bg-sky-50' },
    { title: 'Total Revenue', value: '₹0', change: '₹0 collected', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
            <Badge variant="primary" dot>Live Mode</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Welcome to OfficeFlow centralized workspace management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Plus}>New Client</Button>
          <Button variant="primary" size="sm" icon={Plus}>Create Invoice</Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.title}</span>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                <span className="block text-xs font-medium text-slate-500 mt-1">{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-xs min-h-[300px] flex flex-col justify-center items-center text-center">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Financial Revenue & Analytics</h3>
          <p className="text-xs text-slate-500 max-w-md mt-1">
            Charts and cashflow summaries will dynamically render here when connected with MongoDB business records.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs min-h-[300px]">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Upcoming Calendar Events</h3>
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-xs text-slate-400">No scheduled meetings or deadlines for today.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
