import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import paymentsApi from '../../api/payments.api';
import invoicesApi from '../../api/invoices.api';
import { formatCurrency, formatDate } from '../../utils/formatters';

const today = new Date().toISOString().slice(0, 10);
const methods = ['upi', 'bank_transfer', 'cheque', 'cash', 'card', 'other'];

export default function PaymentsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ invoice: '', amount: '', method: 'upi', paymentDate: today, referenceNumber: '' });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([paymentsApi.getPayments({ limit: 100 }), invoicesApi.getInvoices({ limit: 100 })])
      .then(([paymentResponse, invoiceResponse]) => {
        setPayments(paymentResponse.data?.payments || []);
        setInvoices((invoiceResponse.data?.invoices || []).filter((invoice) => Number(invoice.balanceDue) > 0));
      })
      .catch((error) => showToast(error.message || 'Unable to load payment records.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const selectedInvoice = invoices.find((invoice) => invoice._id === form.invoice);
  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await paymentsApi.createPayment({ ...form, amount: Number(form.amount) });
      showToast('Payment recorded and invoice balance updated.', 'success');
      setOpen(false);
      setForm({ invoice: '', amount: '', method: 'upi', paymentDate: today, referenceNumber: '' });
      load();
    } catch (error) { showToast(error.message || 'Payment could not be recorded.', 'error'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    try {
      await paymentsApi.deletePayment(deleteTarget._id);
      showToast('Payment deleted and invoice balance recalculated.', 'success');
      setDeleteTarget(null);
      load();
    } catch (error) { showToast(error.message || 'Payment could not be deleted.', 'error'); }
  };

  const columns = [
    { header: 'Payment #', key: 'paymentNumber', render: (row) => <span className="font-mono font-semibold">{row.paymentNumber}</span> },
    { header: 'Invoice #', key: 'invoice', render: (row) => row.invoice?.invoiceNumber || '—' },
    { header: 'Client', key: 'client', render: (row) => row.client?.companyName || row.client?.contactPerson || '—' },
    { header: 'Date', key: 'paymentDate', render: (row) => formatDate(row.paymentDate) },
    { header: 'Method', key: 'method', render: (row) => <span className="capitalize">{row.method?.replaceAll('_', ' ')}</span> },
    { header: 'Reference #', key: 'referenceNumber', render: (row) => <span className="font-mono text-xs text-slate-600">{row.referenceNumber || '—'}</span> },
    { header: 'Amount', key: 'amount', align: 'right', render: (row) => formatCurrency(row.amount) },
    ...(isAdmin ? [{ header: 'Actions', key: 'actions', align: 'right', render: (row) => <button title="Delete payment" onClick={() => setDeleteTarget(row)} className="rounded p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button> }] : [])
  ];

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><CreditCard size={22} /> Payment Records</h1><p className="mt-1 text-sm text-slate-500">Record payments against invoices and track transaction history</p></div><Button icon={Plus} onClick={() => setOpen(true)}>Record Payment</Button></div>
    <Table columns={columns} data={payments} isLoading={loading} emptyMessage="No payment records found" emptySubtext="Record incoming payments against issued invoices." />
    {open && <Modal isOpen onClose={() => setOpen(false)} title="Record a payment"><form onSubmit={create} className="space-y-4">
      <div><label htmlFor="paymentInvoice" className="mb-1 block text-xs font-semibold uppercase text-slate-600">Invoice</label><select id="paymentInvoice" required value={form.invoice} onChange={(event) => setForm({ ...form, invoice: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Select an outstanding invoice</option>{invoices.map((invoice) => <option key={invoice._id} value={invoice._id}>{invoice.invoiceNumber} · {invoice.client?.companyName || invoice.clientId?.companyName || 'Client'} · due {formatCurrency(invoice.balanceDue)}</option>)}</select></div>
      {selectedInvoice && <p className="text-xs text-slate-500">Maximum amount: {formatCurrency(selectedInvoice.balanceDue)}</p>}
      <Input label="Amount (INR)" name="amount" type="number" min="0.01" max={selectedInvoice?.balanceDue} step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
      <div><label htmlFor="paymentMethod" className="mb-1 block text-xs font-semibold uppercase text-slate-600">Payment method</label><select id="paymentMethod" value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{methods.map((method) => <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-3"><Input label="Payment date" name="paymentDate" type="date" required value={form.paymentDate} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} /><Input label="Reference (optional)" name="referenceNumber" value={form.referenceNumber} onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })} /></div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" isLoading={saving} disabled={!invoices.length}>Record payment</Button></div>
    </form></Modal>}
    {deleteTarget && <ConfirmDialog isOpen onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Delete payment" message={`Delete payment ${deleteTarget.paymentNumber}? The invoice balance will be recalculated.`} confirmText="Delete" />}
  </div>;
}
