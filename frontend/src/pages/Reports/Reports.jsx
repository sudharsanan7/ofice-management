import React, { useEffect, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Input from '../../components/common/Input';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useToast } from '../../context/ToastContext';
import reportsApi from '../../api/reports.api';
import { formatCurrency } from '../../utils/formatters';

const saveFile = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    setLoading(true);
    reportsApi.getSummary({ startDate: startDate || undefined, endDate: endDate || undefined })
      .then((response) => setSummary(response.data))
      .catch((error) => showToast(error.message || 'Unable to load report data.', 'error'))
      .finally(() => setLoading(false));
  }, [startDate, endDate, showToast]);

  const exportReport = async (format) => {
    setExporting(format);
    try {
      const blob = await reportsApi.export({ startDate: startDate || undefined, endDate: endDate || undefined, format });
      saveFile(blob, `officeflow-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
    } catch (error) {
      showToast(error.message || 'Report export failed.', 'error');
    } finally {
      setExporting('');
    }
  };

  const totals = summary?.totals || {};

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1><p className="mt-1 text-sm text-slate-500">Financial summaries and quotation conversion</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" icon={FileSpreadsheet} isLoading={exporting === 'xlsx'} disabled={!!exporting} onClick={() => exportReport('xlsx')}>Export Excel</Button><Button size="sm" icon={Download} isLoading={exporting === 'pdf'} disabled={!!exporting} onClick={() => exportReport('pdf')}>Export PDF</Button></div></div>
    <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"><Input label="From" name="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /><Input label="To" name="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></section>
    {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : <>
      <div className="grid gap-4 sm:grid-cols-3">{[['Revenue collected', totals.revenue], ['Expenses', totals.expenses], ['Net', totals.net]].map(([label, amount]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(amount)}</p></div>)}</div>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-semibold text-slate-800">Monthly revenue vs expenses</h2>{summary?.trends?.length ? <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.trends} margin={{ top: 8, right: 12, left: 12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(value)} /><Tooltip formatter={(value) => formatCurrency(value)} /><Legend /><Bar dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} /><Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-slate-500">No monthly revenue or expense activity for this date range.</p>}</section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><BarChart3 size={18} /> Quotations</h2><div className="divide-y divide-slate-100">{Object.entries(summary?.quotations || {}).map(([status, data]) => <div key={status} className="flex justify-between py-2 text-sm"><span className="capitalize text-slate-600">{status}</span><span className="font-medium text-slate-900">{data.count} · {formatCurrency(data.total)}</span></div>)}</div><p className="mt-4 text-sm text-slate-600">Accepted quotations converted: <strong>{summary?.quotationConversion?.converted || 0} / {summary?.quotationConversion?.accepted || 0} ({summary?.quotationConversion?.rate || 0}%)</strong></p></section>
        <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-semibold text-slate-800">Outstanding invoices</h2><div className="divide-y divide-slate-100">{(summary?.outstanding || []).length ? summary.outstanding.map((row) => <div key={row._id} className="flex justify-between py-2 text-sm"><span className="capitalize text-slate-600">{row._id} · {row.count}</span><span className="font-medium text-slate-900">{formatCurrency(row.due)}</span></div>) : <p className="text-sm text-slate-500">No outstanding invoices.</p>}</div><h3 className="mb-3 mt-6 font-semibold text-slate-800">Expenses by category</h3><div className="divide-y divide-slate-100">{(summary?.expenses || []).map((row) => <div key={row._id} className="flex justify-between py-2 text-sm"><span className="text-slate-600">{String(row._id).replaceAll('_', ' ')}</span><span className="font-medium text-slate-900">{formatCurrency(row.total)}</span></div>)}</div></section>
      </div>
    </>}
  </div>;
}
