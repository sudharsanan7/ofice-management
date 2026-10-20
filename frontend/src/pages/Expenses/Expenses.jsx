import React, { useCallback, useEffect, useState } from 'react';
import { Download, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import expensesApi from '../../api/expenses.api';
import { formatCurrency, formatDate } from '../../utils/formatters';

const categories = ['office_supplies', 'travel', 'utilities', 'software', 'salaries', 'marketing', 'maintenance', 'professional_fees', 'other'];
const today = new Date().toISOString().slice(0, 10);

export default function ExpensesPage() {
  const { isAdmin, user } = useAuth();
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ category: 'office_supplies', description: '', amount: '', expenseDate: today, receipt: null });

  const load = useCallback(() => {
    setLoading(true);
    expensesApi.getExpenses({ limit: 100 })
      .then((response) => { setExpenses(response.data?.expenses || []); setSummary(response.data?.summary || { totalAmount: 0, count: 0 }); })
      .catch((error) => showToast(error.message || 'Unable to load expenses.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const saveExpense = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      data.append('category', form.category);
      data.append('description', form.description);
      data.append('amount', form.amount);
      data.append('expenseDate', form.expenseDate);
      if (form.receipt) data.append('receipt', form.receipt);
      if (editTarget) {
        await expensesApi.updateExpense(editTarget._id, data);
        showToast('Expense updated.', 'success');
      } else {
        await expensesApi.createExpense(data);
        showToast('Expense recorded.', 'success');
      }
      setOpen(false);
      setEditTarget(null);
      setForm({ category: 'office_supplies', description: '', amount: '', expenseDate: today, receipt: null });
      load();
    } catch (error) { showToast(error.message || 'Expense could not be recorded.', 'error'); }
    finally { setSaving(false); }
  };

  const downloadReceipt = async (expense) => {
    try {
      const blob = await expensesApi.downloadReceipt(expense._id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = expense.receiptOriginalName || `receipt-${expense._id}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) { showToast(error.message || 'Receipt download failed.', 'error'); }
  };

  const remove = async () => {
    try {
      await expensesApi.deleteExpense(deleteTarget._id);
      showToast('Expense deleted.', 'success');
      setDeleteTarget(null);
      load();
    } catch (error) { showToast(error.message || 'Expense could not be deleted.', 'error'); }
  };

  const beginEdit = (expense) => {
    setEditTarget(expense);
    setForm({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      expenseDate: new Date(expense.expenseDate).toISOString().slice(0, 10),
      receipt: null
    });
    setOpen(true);
  };

  const columns = [
    { header: 'Date', key: 'expenseDate', render: (row) => formatDate(row.expenseDate) },
    { header: 'Category', key: 'category', render: (row) => row.category?.replaceAll('_', ' ') },
    { header: 'Description', key: 'description' },
    { header: 'Amount', key: 'amount', align: 'right', render: (row) => formatCurrency(row.amount) },
    { header: 'Receipt', key: 'receiptPath', render: (row) => row.receiptPath ? <button onClick={() => downloadReceipt(row)} className="inline-flex items-center gap-1 text-indigo-600 hover:underline"><Download size={14} /> Download</button> : '—' },
    { header: 'Actions', key: 'actions', align: 'right', render: (row) => <div className="flex justify-end gap-1">{(isAdmin || String(row.createdBy?._id || row.createdBy) === String(user?._id || user?.id)) && <button title="Edit expense" onClick={() => beginEdit(row)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>}{isAdmin && <button title="Delete expense" onClick={() => setDeleteTarget(row)} className="rounded p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button>}</div> }
  ];

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Wallet size={22} /> Expense Tracking</h1><p className="mt-1 text-sm text-slate-500">Record company expenses and attach receipts</p></div><Button icon={Plus} onClick={() => setOpen(true)}>Add Expense</Button></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-500">Expenses recorded</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.count}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase text-slate-500">Total amount</p><p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(summary.totalAmount)}</p></div></div>
    <Table columns={columns} data={expenses} isLoading={loading} emptyMessage="No expenses recorded" emptySubtext="Record office costs, travel, utilities, or other expenses." />
    {open && <Modal isOpen onClose={() => { setOpen(false); setEditTarget(null); }} title={editTarget ? 'Edit expense' : 'Add expense'}><form onSubmit={saveExpense} className="space-y-4">
      <div><label htmlFor="expenseCategory" className="mb-1 block text-xs font-semibold uppercase text-slate-600">Category</label><select id="expenseCategory" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{categories.map((category) => <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}</select></div>
      <Input label="Description" name="description" required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <div className="grid grid-cols-2 gap-3"><Input label="Amount (INR)" name="amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /><Input label="Date" name="expenseDate" type="date" required value={form.expenseDate} onChange={(event) => setForm({ ...form, expenseDate: event.target.value })} /></div>
      <Input label={editTarget?.receiptPath ? 'Replace receipt (optional, max 5MB)' : 'Receipt (optional, max 5MB)'} name="receipt" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => setForm({ ...form, receipt: event.target.files?.[0] || null })} />
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setOpen(false); setEditTarget(null); }}>Cancel</Button><Button type="submit" isLoading={saving}>{editTarget ? 'Save changes' : 'Save expense'}</Button></div>
    </form></Modal>}
    {deleteTarget && <ConfirmDialog isOpen onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Delete expense" message="Delete this expense record and its attached receipt?" confirmText="Delete" />}
  </div>;
}
