import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import invoicesApi from '../../api/invoices.api';
import clientsApi from '../../api/clients.api';
import quotationsApi from '../../api/quotations.api';
import { formatCurrency, formatDate } from '../../utils/formatters';

const statusVariant = { unpaid: 'warning', partially_paid: 'info', paid: 'success', overdue: 'danger' };
const toDateInputValue = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const minimumDueDate = toDateInputValue(new Date());
const defaultDueDate = toDateInputValue(new Date(Date.now() + 15 * 86400000));

export default function InvoicesPage() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quotationId, setQuotationId] = useState(new URLSearchParams(location.search).get('quotationId') || '');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editing, setEditing] = useState(null);
  const [emailTarget, setEmailTarget] = useState(null);
  const [emailForm, setEmailForm] = useState({ subject: '', message: '', cc: '' });
  const [form, setForm] = useState({ client: '', description: '', quantity: 1, unitPrice: '', dueDate: defaultDueDate });

  const loadInvoices = useCallback(() => {
    setLoading(true);
    invoicesApi.getInvoices({ limit: 100 })
      .then((response) => setInvoices(response.data?.invoices || []))
      .catch((error) => showToast(error.message || 'Unable to load invoices.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    loadInvoices();
    clientsApi.getClients({ limit: 100, status: 'active' })
      .then((response) => setClients(response.data?.clients || []))
      .catch((error) => showToast(error.message || 'Unable to load clients.', 'error'));
    quotationsApi.getQuotations({ limit: 100, status: 'accepted' })
      .then((response) => setQuotations(response.data?.quotations || []))
      .catch((error) => showToast(error.message || 'Unable to load accepted quotations.', 'error'));
  }, [loadInvoices, showToast]);

  const download = async (invoice) => {
    try {
      const blob = await invoicesApi.downloadPDF(invoice._id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoice.invoiceNumber.replace(/[\\/]/g, '-')}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) { showToast(error.message || 'PDF download failed.', 'error'); }
  };

  const convert = async (event) => {
    event.preventDefault();
    if (!quotationId) return;
    setSaving(true);
    try {
      await invoicesApi.convertQuotation(quotationId);
      showToast('Accepted quotation converted to an invoice.', 'success');
      setQuotationId('');
      window.history.replaceState({}, '', '/invoices');
      loadInvoices();
      quotationsApi.getQuotations({ limit: 100, status: 'accepted' }).then((response) => setQuotations(response.data?.quotations || []));
    } catch (error) { showToast(error.message || 'Could not convert this quotation.', 'error'); }
    finally { setSaving(false); }
  };

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await invoicesApi.createInvoice({
        client: form.client,
        dueDate: new Date(`${form.dueDate}T23:59:59.999`).toISOString(),
        items: [{ description: form.description, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), gstRate: 18 }]
      });
      showToast('Invoice created.', 'success');
      setOpen(false);
      setForm({ client: '', description: '', quantity: 1, unitPrice: '', dueDate: defaultDueDate });
      loadInvoices();
    } catch (error) { showToast(error.message || 'Invoice could not be created.', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    try {
      await invoicesApi.deleteInvoice(deleteTarget._id);
      showToast('Invoice deleted.', 'success');
      setDeleteTarget(null);
      loadInvoices();
    } catch (error) { showToast(error.message || 'Invoice could not be deleted.', 'error'); }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await invoicesApi.updateInvoice(editing._id, {
        dueDate: new Date(`${editing.dueDateInput}T23:59:59.999`).toISOString(),
        items: editing.items.map((item) => ({
          description: item.description,
          sacCode: item.sacCode || '',
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount || 0),
          gstRate: Number(item.gstRate)
        }))
      });
      showToast('Invoice updated.', 'success');
      setEditing(null);
      loadInvoices();
    } catch (error) { showToast(error.message || 'Invoice could not be updated.', 'error'); }
    finally { setSaving(false); }
  };

  const sendEmail = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await invoicesApi.sendEmail(emailTarget._id, {
        subject: emailForm.subject || undefined,
        message: emailForm.message || undefined,
        cc: emailForm.cc.trim() || undefined
      });
      showToast('Invoice emailed to the client.', 'success');
      setEmailTarget(null);
    } catch (error) { showToast(error.message || 'Invoice email could not be sent.', 'error'); }
    finally { setSaving(false); }
  };

  const beginEdit = (invoice) => {
    const dateValue = invoice.dueDate ? new Date(invoice.dueDate) : new Date();
    setEditing({
      ...invoice,
      dueDateInput: toDateInputValue(dateValue),
      items: (invoice.items || []).map((item) => ({
        description: item.description || '',
        sacCode: item.sacCode || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice ?? '',
        discount: item.discount || 0,
        gstRate: item.gstRate ?? 18
      }))
    });
  };

  const columns = [
    { header: 'Invoice #', key: 'invoiceNumber', render: (row) => <span className="font-mono font-semibold">{row.invoiceNumber}</span> },
    { header: 'Client', key: 'client', render: (row) => row.client?.companyName || row.clientId?.companyName || '—' },
    { header: 'Due date', key: 'dueDate', render: (row) => formatDate(row.dueDate) },
    { header: 'Total', key: 'grandTotal', align: 'right', render: (row) => formatCurrency(row.grandTotal) },
    { header: 'Balance due', key: 'balanceDue', align: 'right', render: (row) => formatCurrency(row.balanceDue) },
    { header: 'Status', key: 'status', render: (row) => <Badge variant={statusVariant[row.status] || 'default'}>{row.status?.replaceAll('_', ' ')}</Badge> },
    { header: 'Actions', key: 'actions', align: 'right', render: (row) => <div className="flex justify-end gap-1"><button title="Download PDF" onClick={() => download(row)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Download size={16} /></button>{row.client?.email && <button title="Email invoice" onClick={() => { setEmailTarget(row); setEmailForm({ subject: `Invoice ${row.invoiceNumber}`, message: `Please find invoice ${row.invoiceNumber} attached.`, cc: '' }); }} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Mail size={16} /></button>}{isAdmin && row.status !== 'paid' && <button title="Edit invoice" onClick={() => beginEdit(row)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>}{isAdmin && <button title="Delete" onClick={() => setDeleteTarget(row)} className="rounded p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button>}</div> }
  ];

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Invoices & Billing</h1><p className="mt-1 text-sm text-slate-500">Issue invoices, track balances, and download PDF copies</p></div><Button icon={Plus} onClick={() => setOpen(true)}>Create Invoice</Button></div>
    {quotations.length > 0 && <form onSubmit={convert} className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 sm:flex-row sm:items-end"><div className="flex-1"><label htmlFor="acceptedQuotation" className="mb-1 block text-xs font-semibold uppercase text-slate-600">Convert accepted quotation</label><select id="acceptedQuotation" value={quotationId} onChange={(event) => setQuotationId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Choose a quotation</option>{quotations.map((quotation) => <option key={quotation._id} value={quotation._id} disabled={!!quotation.convertedToInvoice}>{quotation.quotationNumber} — {quotation.client?.companyName}{quotation.convertedToInvoice ? ' (converted)' : ''}</option>)}</select></div><Button type="submit" disabled={!quotationId} isLoading={saving}>Convert to Invoice</Button></form>}
    <Table columns={columns} data={invoices} isLoading={loading} emptyMessage="No invoices generated yet" emptySubtext="Create an invoice or convert an accepted quotation." />
    {open && <Modal isOpen={open} onClose={() => setOpen(false)} title="Create invoice" subtitle="Invoice totals and GST are calculated by the server"><form onSubmit={create} className="space-y-4">
      <div><label htmlFor="invoiceClient" className="mb-1 block text-xs font-semibold uppercase text-slate-600">Client</label><select id="invoiceClient" required value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Select a client</option>{clients.map((client) => <option key={client._id} value={client._id}>{client.companyName}</option>)}</select></div>
      <Input label="Description" name="description" required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <div className="grid grid-cols-2 gap-3"><Input label="Quantity" name="quantity" type="number" min="0.01" step="any" required value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /><Input label="Unit price (INR)" name="unitPrice" type="number" min="0" step="0.01" required value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} /></div>
      <Input label="Due date" name="dueDate" type="date" min={minimumDueDate} required value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" isLoading={saving}>Create invoice</Button></div>
    </form></Modal>}
    {editing && <Modal isOpen onClose={() => setEditing(null)} title={`Edit ${editing.invoiceNumber}`} subtitle="Totals and taxes are recalculated on the server"><form onSubmit={saveEdit} className="space-y-4">
      {editing.items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between"><legend className="px-1 text-xs font-semibold uppercase text-slate-600">Item {index + 1}</legend><button type="button" disabled={editing.items.length === 1} onClick={() => setEditing({ ...editing, items: editing.items.filter((_, itemIndex) => itemIndex !== index) })} className="rounded p-1 text-rose-600 disabled:opacity-40" aria-label={`Remove item ${index + 1}`}><Trash2 size={15} /></button></div>
        <Input label="Description" name={`editDescription${index}`} required value={item.description} onChange={(event) => setEditing({ ...editing, items: editing.items.map((line, itemIndex) => itemIndex === index ? { ...line, description: event.target.value } : line) })} />
        <div className="grid grid-cols-2 gap-3"><Input label="SAC code" name={`editSacCode${index}`} value={item.sacCode} onChange={(event) => setEditing({ ...editing, items: editing.items.map((line, itemIndex) => itemIndex === index ? { ...line, sacCode: event.target.value } : line) })} /><Input label="Quantity" name={`editQuantity${index}`} type="number" min="0.01" step="any" required value={item.quantity} onChange={(event) => setEditing({ ...editing, items: editing.items.map((line, itemIndex) => itemIndex === index ? { ...line, quantity: event.target.value } : line) })} /></div>
        <div className="grid grid-cols-3 gap-2"><Input label="Unit price" name={`editPrice${index}`} type="number" min="0" step="0.01" required value={item.unitPrice} onChange={(event) => setEditing({ ...editing, items: editing.items.map((line, itemIndex) => itemIndex === index ? { ...line, unitPrice: event.target.value } : line) })} /><Input label="Discount" name={`editDiscount${index}`} type="number" min="0" step="0.01" value={item.discount} onChange={(event) => setEditing({ ...editing, items: editing.items.map((line, itemIndex) => itemIndex === index ? { ...line, discount: event.target.value } : line) })} /><div><label htmlFor={`editGstRate${index}`} className="mb-1 block text-xs font-semibold uppercase text-slate-600">GST rate</label><select id={`editGstRate${index}`} value={item.gstRate} onChange={(event) => setEditing({ ...editing, items: editing.items.map((line, itemIndex) => itemIndex === index ? { ...line, gstRate: event.target.value } : line) })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{[0, 5, 12, 18, 28].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}</select></div></div>
      </fieldset>)}
      <Button variant="outline" size="sm" icon={Plus} onClick={() => setEditing({ ...editing, items: [...editing.items, { description: '', sacCode: '', quantity: 1, unitPrice: '', discount: 0, gstRate: 18 }] })}>Add item</Button>
      <Input label="Due date" name="editDueDate" type="date" required value={editing.dueDateInput} onChange={(event) => setEditing({ ...editing, dueDateInput: event.target.value })} />
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" isLoading={saving}>Save changes</Button></div>
    </form></Modal>}
    {emailTarget && <Modal isOpen onClose={() => setEmailTarget(null)} title={`Email ${emailTarget.invoiceNumber}`} subtitle={`Recipient: ${emailTarget.client?.email || 'client email unavailable'}`}><form onSubmit={sendEmail} className="space-y-4">
      <Input label="Subject" name="emailSubject" value={emailForm.subject} onChange={(event) => setEmailForm({ ...emailForm, subject: event.target.value })} />
      <Input label="Message" name="emailMessage" type="textarea" value={emailForm.message} onChange={(event) => setEmailForm({ ...emailForm, message: event.target.value })} />
      <Input label="CC (optional)" name="emailCc" type="email" value={emailForm.cc} onChange={(event) => setEmailForm({ ...emailForm, cc: event.target.value })} />
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEmailTarget(null)}>Cancel</Button><Button type="submit" isLoading={saving}>Send invoice</Button></div>
    </form></Modal>}
    {deleteTarget && <ConfirmDialog isOpen onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Delete invoice" message={`Delete ${deleteTarget.invoiceNumber}? Invoices with recorded payments cannot be deleted.`} confirmText="Delete" variant="danger" />}
  </div>;
}
