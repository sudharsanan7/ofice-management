import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users2, FileSpreadsheet, Receipt, CreditCard, Wallet, Plus, CalendarDays, Activity } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import dashboardApi from '../../api/dashboard.api';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    dashboardApi.getSummary()
      .then((response) => setSummary(response.data))
      .catch((error) => showToast(error.message || 'Unable to load dashboard data.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const totals = summary?.totals || {};
  const cards = [
    { title: 'Total Clients', value: totals.clients ?? 0, detail: 'Active clients', icon: Users2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Active Quotations', value: totals.activeQuotations ?? 0, detail: `${totals.quotations ?? 0} total quotations`, icon: FileSpreadsheet, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Total Invoices', value: totals.invoices ?? 0, detail: `${formatCurrency(totals.outstanding)} pending payments`, icon: Receipt, color: 'text-sky-600', bg: 'bg-sky-50' },
    { title: 'Revenue Collected', value: formatCurrency(totals.revenue), detail: `${formatCurrency(totals.net)} net after expenses`, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Recorded Expenses', value: formatCurrency(totals.expenses), detail: 'Total company expenses', icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50' }
  ];

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1><Badge variant="success" dot>Live data</Badge></div><p className="mt-1 text-sm text-slate-500">Your OfficeFlow business at a glance</p></div>
      <div className="flex flex-wrap gap-2"><Link to="/clients"><Button variant="outline" size="sm" icon={Plus}>New Client</Button></Link><Link to="/quotations/new"><Button variant="outline" size="sm" icon={Plus}>New Quotation</Button></Link><Link to="/invoices"><Button size="sm" icon={Plus}>Create Invoice</Button></Link><Link to="/expenses"><Button variant="outline" size="sm" icon={Plus}>Add Expense</Button></Link></div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(({ title, value, detail, icon: Icon, color, bg }) => <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span><span className={`rounded-lg p-2 ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></span></div><div className="mt-3 text-2xl font-bold text-slate-900">{value}</div><div className="mt-1 text-xs text-slate-500">{detail}</div></div>)}
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><CalendarDays size={18} /> Upcoming events</h2>
        {summary?.upcomingEvents?.length ? <ul className="divide-y divide-slate-100">{summary.upcomingEvents.map((event) => {
          const assignees = Array.isArray(event.assignedTo)
            ? event.assignedTo.map((person) => person.name).join(', ')
            : event.assignedTo?.name;
          return <li key={event._id} className="flex justify-between gap-4 py-3"><div><p className="font-medium text-slate-800">{event.title}</p><p className="text-xs text-slate-500">{assignees || 'No assignees'}</p></div><time className="shrink-0 text-xs text-slate-500">{formatDateTime(event.date)}</time></li>;
        })}</ul> : <p className="py-8 text-center text-sm text-slate-400">No upcoming events.</p>}
        <Link to="/calendar" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline">Open calendar</Link>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Activity size={18} /> Recent activity</h2>
        {summary?.recentActivity?.length ? <ul className="divide-y divide-slate-100">{summary.recentActivity.map((item) => <li key={item._id} className="py-3"><p className="text-sm text-slate-800"><span className="font-medium">{item.user?.name || 'System'}</span> {item.action?.toLowerCase()} {item.entity?.toLowerCase()}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(item.timestamp)}</p></li>)}</ul> : <p className="py-8 text-center text-sm text-slate-400">No activity recorded yet.</p>}
        <Link to="/logs" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline">View audit log</Link>
      </section>
    </div>
  </div>;
}
