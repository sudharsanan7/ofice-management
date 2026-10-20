import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import quotationsApi from '../../api/quotations.api';
import clientsApi from '../../api/clients.api';
import settingsApi from '../../api/settings.api';

const GST_RATES = [0, 5, 12, 18, 28];
const blankItem = () => ({ description: '', sacCode: '', quantity: '1', unitPrice: '0', discount: '0', gstRate: '18' });
const localDate = (date) => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};
const currency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(value || 0);

function previewTotals(items, isInter) {
  let subtotal = 0; let discounts = 0; let cgst = 0; let sgst = 0; let igst = 0;
  items.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const unitPaise = Math.round((Number(item.unitPrice) || 0) * 100);
    const gross = Math.round(qty * unitPaise);
    const discount = Math.min(gross, Math.round((Number(item.discount) || 0) * 100));
    const lineSubtotal = Math.max(0, gross - discount);
    const tax = Math.round(lineSubtotal * (Number(item.gstRate) || 0) / 100);
    subtotal += lineSubtotal;
    discounts += discount;
    if (isInter) igst += tax;
    else { const lineCgst = Math.floor(tax / 2); cgst += lineCgst; sgst += tax - lineCgst; }
  });
  return { subtotal: subtotal / 100, discounts: discounts / 100, cgst: cgst / 100, sgst: sgst / 100, igst: igst / 100, total: (subtotal + cgst + sgst + igst) / 100 };
}

export default function QuotationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = Boolean(id);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [companyState, setCompanyState] = useState('');
  const [issueDate, setIssueDate] = useState(localDate(new Date()));
  const [validUntil, setValidUntil] = useState(localDate(Date.now() + 30 * 86400000));
  const [items, setItems] = useState([blankItem()]);
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [clientResult, settingsResult, quotationResult] = await Promise.all([
          clientsApi.getClients({ limit: 100 }), settingsApi.getSettings(),
          isEdit ? quotationsApi.getQuotationById(id) : Promise.resolve(null),
        ]);
        if (!mounted) return;
        const availableClients = clientResult.data?.clients || [];
        const settings = settingsResult.data || {};
        setClients(availableClients);
        setCompanyState(settings.state || settings.address?.state || '');
        if (!isEdit) {
          setTerms(settings.defaultQuotationTerms || '');
          const days = Number(settings.defaultQuotationValidityDays) || 30;
          setValidUntil(localDate(Date.now() + days * 86400000));
        }
        if (quotationResult) {
          const quotation = quotationResult.data;
          setClientId(quotation.client?._id || quotation.client || '');
          if (quotation.client && !availableClients.some((entry) => entry._id === quotation.client._id)) setClients([...availableClients, quotation.client]);
          setIssueDate(localDate(quotation.issueDate));
          setValidUntil(localDate(quotation.validUntil));
          setItems(quotation.items?.length ? quotation.items.map((entry) => ({ description: entry.description || '', sacCode: entry.sacCode || '', quantity: String(entry.quantity), unitPrice: String(entry.unitPrice), discount: String(entry.discount || 0), gstRate: String(entry.gstRate) })) : [blankItem()]);
          setTerms(quotation.terms || '');
          setNotes(quotation.notes || '');
        }
      } catch (error) {
        showToast(error?.message || 'Unable to load quotation form.', 'error');
        if (isEdit) navigate('/quotations');
      } finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [id, isEdit, navigate, showToast]);

  const visibleClients = clients.filter((client) => `${client.companyName} ${client.contactPerson || ''}`.toLowerCase().includes(clientSearch.toLowerCase()));
  const selectedClient = clients.find((client) => client._id === clientId);
  const clientState = selectedClient?.billingAddress?.state || selectedClient?.stateCode || '';
  const isInter = Boolean(clientState && companyState && clientState.trim().toLowerCase() !== companyState.trim().toLowerCase());
  const totals = useMemo(() => previewTotals(items, isInter), [items, isInter]);

  const changeItem = (index, field, value) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const validate = () => {
    const nextErrors = {};
    if (!clientId) nextErrors.client = 'Select a client.';
    if (!issueDate) nextErrors.issueDate = 'Issue date is required.';
    if (!validUntil) nextErrors.validUntil = 'Valid-until date is required.';
    if (issueDate && validUntil && validUntil < issueDate) nextErrors.validUntil = 'Valid until must be on or after issue date.';
    items.forEach((item, index) => {
      if (!item.description.trim()) nextErrors[`items.${index}.description`] = 'Description is required.';
      if (!(Number(item.quantity) > 0)) nextErrors[`items.${index}.quantity`] = 'Quantity must be greater than zero.';
      if (!(Number(item.unitPrice) >= 0)) nextErrors[`items.${index}.unitPrice`] = 'Unit price cannot be negative.';
      if (!(Number(item.discount) >= 0)) nextErrors[`items.${index}.discount`] = 'Discount cannot be negative.';
      if (!GST_RATES.includes(Number(item.gstRate))) nextErrors[`items.${index}.gstRate`] = 'Choose a valid GST rate.';
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async (sendAfterSave) => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      client: clientId, issueDate, validUntil,
      items: items.map((item) => ({ description: item.description.trim(), sacCode: item.sacCode.trim(), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discount: Number(item.discount) || 0, gstRate: Number(item.gstRate) })),
      terms, notes,
    };
    try {
      const result = isEdit ? await quotationsApi.updateQuotation(id, payload) : await quotationsApi.createQuotation(payload);
      const saved = result.data;
      if (sendAfterSave) {
        try {
          await quotationsApi.sendEmail(saved._id, {});
          showToast('Quotation saved and emailed to the client.', 'success');
        } catch (emailError) {
          showToast(emailError?.message || 'Quotation was saved as a draft, but the email could not be sent.', 'error');
          navigate(`/quotations/${saved._id}`);
          return;
        }
      } else showToast(isEdit ? 'Quotation updated.' : 'Quotation saved as draft.', 'success');
      navigate(`/quotations/${saved._id}`);
    } catch (error) {
      showToast(error?.message || 'Unable to save quotation.', 'error');
      const mapped = {};
      (error?.errors || []).forEach((entry) => { if (entry.field) mapped[entry.field] = entry.message; });
      setErrors((current) => ({ ...current, ...mapped }));
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner /><span className="ml-3 text-sm text-slate-500">Loading quotation…</span></div>;

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-center gap-3"><Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/quotations')}>Back</Button><div><h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit quotation' : 'Create quotation'}</h1><p className="text-sm text-slate-500">Totals are calculated and verified by the server.</p></div></div>
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <section className="grid gap-4 md:grid-cols-3">
        <div><Input label="Search clients" name="client-search" value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Search by client name" /><label htmlFor="quotation-client" className="mt-3 mb-1 block text-xs font-semibold uppercase text-slate-700">Client <span className="text-rose-600">*</span></label><select id="quotation-client" value={clientId} onChange={(event) => setClientId(event.target.value)} className={`w-full rounded-lg border bg-white px-3 py-2 text-sm ${errors.client ? 'border-rose-400' : 'border-slate-300'}`}><option value="">Select a client</option>{visibleClients.map((client) => <option key={client._id} value={client._id}>{client.companyName} — {client.contactPerson}</option>)}</select>{errors.client && <p className="mt-1 text-xs text-rose-600">{errors.client}</p>}</div>
        <Input label="Issue date" name="issue-date" type="date" required value={issueDate} onChange={(event) => setIssueDate(event.target.value)} error={errors.issueDate} />
        <Input label="Valid until" name="valid-until" type="date" required value={validUntil} onChange={(event) => setValidUntil(event.target.value)} error={errors.validUntil} />
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Line items</h2><p className="text-xs text-slate-500">Tax type preview: {isInter ? 'IGST (inter-state)' : 'CGST + SGST (intra-state)'}</p></div><Button variant="outline" size="sm" icon={Plus} onClick={() => setItems((current) => [...current, blankItem()])}>Add item</Button></div>
        <div className="space-y-4">{items.map((item, index) => <div key={index} className="rounded-lg border border-slate-200 p-4"><div className="mb-3 flex justify-between"><h3 className="text-sm font-semibold text-slate-700">Item {index + 1}</h3><button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-rose-600 disabled:opacity-40" aria-label={`Remove item ${index + 1}`}><Trash2 size={17} /></button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input className="sm:col-span-2 lg:col-span-3" label="Description" name={`item-description-${index}`} value={item.description} onChange={(event) => changeItem(index, 'description', event.target.value)} error={errors[`items.${index}.description`]} required />
          <Input label="SAC code" name={`item-sac-${index}`} value={item.sacCode} onChange={(event) => changeItem(index, 'sacCode', event.target.value)} />
          <Input label="Quantity" name={`item-quantity-${index}`} type="number" min="0.0001" step="any" value={item.quantity} onChange={(event) => changeItem(index, 'quantity', event.target.value)} error={errors[`items.${index}.quantity`]} required />
          <Input label="Unit price (₹)" name={`item-price-${index}`} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => changeItem(index, 'unitPrice', event.target.value)} error={errors[`items.${index}.unitPrice`]} required />
          <Input label="Discount (₹)" name={`item-discount-${index}`} type="number" min="0" step="0.01" value={item.discount} onChange={(event) => changeItem(index, 'discount', event.target.value)} error={errors[`items.${index}.discount`]} />
          <div><label htmlFor={`item-gst-${index}`} className="mb-1 block text-xs font-semibold uppercase text-slate-700">GST rate</label><select id={`item-gst-${index}`} value={item.gstRate} onChange={(event) => changeItem(index, 'gstRate', event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{GST_RATES.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}</select>{errors[`items.${index}.gstRate`] && <p className="mt-1 text-xs text-rose-600">{errors[`items.${index}.gstRate`]}</p>}</div>
        </div></div>)}</div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4"><Input label="Terms & Conditions" name="quotation-terms" type="textarea" rows={5} value={terms} onChange={(event) => setTerms(event.target.value)} /><Input label="Notes" name="quotation-notes" type="textarea" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
        <div className="rounded-lg bg-slate-50 p-4"><h2 className="mb-3 font-semibold text-slate-900">Totals preview</h2><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{currency(totals.subtotal)}</span></div><div className="flex justify-between"><span>Discount</span><span>− {currency(totals.discounts)}</span></div>{isInter ? <div className="flex justify-between"><span>IGST</span><span>{currency(totals.igst)}</span></div> : <><div className="flex justify-between"><span>CGST</span><span>{currency(totals.cgst)}</span></div><div className="flex justify-between"><span>SGST</span><span>{currency(totals.sgst)}</span></div></>}<div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base font-bold"><span>Grand total</span><span>{currency(totals.total)}</span></div></div></div>
      </section>
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4"><Button variant="outline" onClick={() => navigate('/quotations')} disabled={saving}>Cancel</Button><Button variant="secondary" isLoading={saving} disabled={saving} onClick={() => save(false)}>Save as Draft</Button><Button isLoading={saving} disabled={saving} onClick={() => save(true)}>Save &amp; Send</Button></div>
    </div>
  </div>;
}
