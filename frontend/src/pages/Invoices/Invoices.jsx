import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Eye, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
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
  const [viewing, setViewing] = useState(null);
  const [emailTarget, setEmailTarget] = useState(null);
  const [emailForm, setEmailForm] = useState({ subject: '', message: '', cc: '' });
  const [form, setForm] = useState({
    client: '',
    issueDate: minimumDueDate,
    dueDate: defaultDueDate,
    items: [{ description: '', sacCode: '', quantity: 1, unitPrice: '', discount: 0, gstRate: 18 }]
  });

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
        issueDate: new Date(`${form.issueDate}T00:00:00.000`).toISOString(),
        dueDate: new Date(`${form.dueDate}T23:59:59.999`).toISOString(),
        items: form.items.map((item) => ({
          description: item.description,
          sacCode: item.sacCode || '',
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount || 0),
          gstRate: Number(item.gstRate ?? 18)
        }))
      });
      showToast('Invoice created.', 'success');
      setOpen(false);
      setForm({
        client: '',
        issueDate: minimumDueDate,
        dueDate: defaultDueDate,
        items: [{ description: '', sacCode: '', quantity: 1, unitPrice: '', discount: 0, gstRate: 18 }]
      });
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
    { header: 'Invoice #', key: 'invoiceNumber', render: (row) => <button type="button" onClick={() => setViewing(row)} className="font-mono font-semibold text-indigo-700 hover:underline">{row.invoiceNumber}</button> },
    { header: 'Client', key: 'client', render: (row) => row.client?.companyName || row.clientId?.companyName || '—' },
    { header: 'Issue date', key: 'issueDate', render: (row) => formatDate(row.issueDate) },
    { header: 'Due date', key: 'dueDate', render: (row) => formatDate(row.dueDate) },
    { header: 'Total', key: 'grandTotal', align: 'right', render: (row) => formatCurrency(row.grandTotal) },
    { header: 'Balance due', key: 'balanceDue', align: 'right', render: (row) => formatCurrency(row.balanceDue) },
    { header: 'Status', key: 'status', render: (row) => <Badge variant={statusVariant[row.status] || 'default'}>{row.status?.replaceAll('_', ' ')}</Badge> },
    { header: 'Actions', key: 'actions', align: 'right', render: (row) => <div className="flex justify-end gap-1"><button title="View invoice details & history" onClick={() => setViewing(row)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Eye size={16} /></button><button title="Download PDF" onClick={() => download(row)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Download size={16} /></button>{row.client?.email && <button title="Email invoice" onClick={() => { setEmailTarget(row); setEmailForm({ subject: `Invoice ${row.invoiceNumber}`, message: `Please find invoice ${row.invoiceNumber} attached.`, cc: '' }); }} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Mail size={16} /></button>}{isAdmin && row.status !== 'paid' && <button title="Edit invoice" onClick={() => beginEdit(row)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>}{isAdmin && <button title="Delete" onClick={() => setDeleteTarget(row)} className="rounded p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button>}</div> }
  ];

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Invoices & Billing</h1><p className="mt-1 text-sm text-slate-500">Issue invoices, track balances, and download PDF copies</p></div><Button icon={Plus} onClick={() => setOpen(true)}>Create Invoice</Button></div>
    {quotations.length > 0 && <form onSubmit={convert} className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 sm:flex-row sm:items-end"><div className="flex-1"><label htmlFor="acceptedQuotation" className="mb-1 block text-xs font-semibold uppercase text-slate-600">Convert accepted quotation</label><select id="acceptedQuotation" value={quotationId} onChange={(event) => setQuotationId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Choose a quotation</option>{quotations.map((quotation) => <option key={quotation._id} value={quotation._id} disabled={!!quotation.convertedToInvoice}>{quotation.quotationNumber} — {quotation.client?.companyName}{quotation.convertedToInvoice ? ' (converted)' : ''}</option>)}</select></div><Button type="submit" disabled={!quotationId} isLoading={saving}>Convert to Invoice</Button></form>}
    <Table columns={columns} data={invoices} isLoading={loading} emptyMessage="No invoices generated yet" emptySubtext="Create an invoice or convert an accepted quotation." />
    {open && <Modal isOpen={open} onClose={() => setOpen(false)} title="Create invoice" subtitle="Invoice totals and GST are calculated by the server" maxWidth="max-w-2xl"><form onSubmit={create} className="space-y-4">
      <div><label htmlFor="invoiceClient" className="mb-1 block text-xs font-semibold uppercase text-slate-600">Client</label><select id="invoiceClient" required value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Select a client</option>{clients.map((client) => <option key={client._id} value={client._id}>{client.companyName}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-3"><Input label="Invoice date" name="issueDate" type="date" required value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} /><Input label="Due date" name="dueDate" type="date" min={form.issueDate || minimumDueDate} required value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div>
      {form.items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between"><legend className="px-1 text-xs font-semibold uppercase text-slate-600">Item {index + 1}</legend><button type="button" disabled={form.items.length === 1} onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })} className="rounded p-1 text-rose-600 disabled:opacity-40" aria-label={`Remove item ${index + 1}`}><Trash2 size={15} /></button></div>
        <Input label="Description" name={index === 0 ? 'description' : `description${index}`} required value={item.description} onChange={(event) => setForm({ ...form, items: form.items.map((line, itemIndex) => itemIndex === index ? { ...line, description: event.target.value } : line) })} />
        <div className="grid grid-cols-2 gap-3"><Input label="SAC code (optional)" name={`sacCode${index}`} value={item.sacCode} onChange={(event) => setForm({ ...form, items: form.items.map((line, itemIndex) => itemIndex === index ? { ...line, sacCode: event.target.value } : line) })} /><Input label="Quantity" name={index === 0 ? 'quantity' : `quantity${index}`} type="number" min="0.01" step="any" required value={item.quantity} onChange={(event) => setForm({ ...form, items: form.items.map((line, itemIndex) => itemIndex === index ? { ...line, quantity: event.target.value } : line) })} /></div>
        <div className="grid grid-cols-3 gap-2"><Input label="Unit price (INR)" name={index === 0 ? 'unitPrice' : `unitPrice${index}`} type="number" min="0" step="0.01" required value={item.unitPrice} onChange={(event) => setForm({ ...form, items: form.items.map((line, itemIndex) => itemIndex === index ? { ...line, unitPrice: event.target.value } : line) })} /><Input label="Discount (INR)" name={`discount${index}`} type="number" min="0" step="0.01" value={item.discount} onChange={(event) => setForm({ ...form, items: form.items.map((line, itemIndex) => itemIndex === index ? { ...line, discount: event.target.value } : line) })} /><div><label htmlFor={`createGstRate${index}`} className="mb-1 block text-xs font-semibold uppercase text-slate-600">GST rate</label><select id={`createGstRate${index}`} value={item.gstRate} onChange={(event) => setForm({ ...form, items: form.items.map((line, itemIndex) => itemIndex === index ? { ...line, gstRate: event.target.value } : line) })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{[0, 5, 12, 18, 28].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}</select></div></div>
      </fieldset>)}
      <Button variant="outline" size="sm" icon={Plus} onClick={() => setForm({ ...form, items: [...form.items, { description: '', sacCode: '', quantity: 1, unitPrice: '', discount: 0, gstRate: 18 }] })}>Add item</Button>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" isLoading={saving}>Create invoice</Button></div>
    </form></Modal>}
    {viewing && <Modal isOpen onClose={() => setViewing(null)} title={`Invoice ${viewing.invoiceNumber}`} subtitle={viewing.client?.companyName || viewing.clientId?.companyName || 'Client details'} maxWidth="max-w-2xl">
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
          <div><span className="block text-xs text-slate-500">Issue date</span><span className="font-semibold">{formatDate(viewing.issueDate)}</span></div>
          <div><span className="block text-xs text-slate-500">Due date</span><span className="font-semibold">{formatDate(viewing.dueDate)}</span></div>
          <div><span className="block text-xs text-slate-500">Amount paid</span><span className="font-semibold text-emerald-600">{formatCurrency(viewing.amountPaid)}</span></div>
          <div><span className="block text-xs text-slate-500">Balance due</span><span className="font-semibold text-rose-600">{formatCurrency(viewing.balanceDue)}</span></div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit price</th><th className="px-3 py-2 text-right">Discount</th><th className="px-3 py-2 text-right">Tax</th><th className="px-3 py-2 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{(viewing.items || []).map((item, idx) => <tr key={idx}><td className="px-3 py-2">{item.description}</td><td className="px-3 py-2 text-right">{item.quantity}</td><td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td><td className="px-3 py-2 text-right">{formatCurrency(item.discount)}</td><td className="px-3 py-2 text-right">{formatCurrency((item.cgst || 0) + (item.sgst || 0) + (item.igst || 0))}</td><td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.lineTotal)}</td></tr>)}</tbody></table></div>
        <div className="flex justify-between rounded-lg bg-slate-50 p-3 font-semibold"><span>Grand total ({viewing.taxType === 'inter' ? 'IGST' : 'CGST + SGST'})</span><span>{formatCurrency(viewing.grandTotal)}</span></div>
        {viewing.statusHistory?.length > 0 && <div><h3 className="mb-2 text-xs font-semibold uppercase text-slate-600">Invoice status history</h3><ul className="space-y-1.5 text-xs text-slate-600">{viewing.statusHistory.map((entry, idx) => <li key={idx} className="flex justify-between border-b border-slate-100 pb-1"><span className="capitalize font-medium text-slate-800">{entry.status?.replaceAll('_', ' ')}</span><span>{formatDate(entry.changedAt)}</span></li>)}</ul></div>}
        <div className="flex justify-end gap-2 pt-2"><Button variant="outline" size="sm" icon={Download} onClick={() => download(viewing)}>Download PDF</Button><Button variant="outline" size="sm" onClick={() => setViewing(null)}>Close</Button></div>
      </div>
    </Modal>}
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
