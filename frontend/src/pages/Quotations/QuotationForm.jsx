import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import quotationsApi from '../../api/quotations.api';
import clientsApi from '../../api/clients.api';
import settingsApi from '../../api/settings.api';

// ─── helpers ────────────────────────────────────────────────────────────────
const GST_RATES = [0, 5, 12, 18, 28];

const EMPTY_ITEM = {
  description: '',
  sacCode: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  gstRate: 18,
};

function calcPreview(items, clientState, companyState) {
  let subtotal = 0;
  let totalDiscount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const intrastate =
    clientState &&
    companyState &&
    clientState.trim().toLowerCase() === companyState.trim().toLowerCase();

  items.forEach((item) => {
    const qty = parseFloat(item.quantity) || 0;
    const up = parseFloat(item.unitPrice) || 0;
    const disc = parseFloat(item.discount) || 0;
    const rate = parseFloat(item.gstRate) || 0;
    const lineAmount = qty * up - disc;
    if (lineAmount <= 0) return;
    subtotal += lineAmount;
    totalDiscount += disc;
    const tax = (lineAmount * rate) / 100;
    if (intrastate) {
      cgst += tax / 2;
      sgst += tax / 2;
    } else {
      igst += tax;
    }
  });

  const grandTotal = subtotal + cgst + sgst + igst;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    intrastate,
  };
}

function formatINR(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n ?? 0);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function futureDateISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── component ──────────────────────────────────────────────────────────────
export default function QuotationForm({ quotation, onSaved, onCancel }) {
  const { showToast } = useToast();
  const isEdit = Boolean(quotation);

  // form state
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState(futureDateISO(30));
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');

  // meta
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [companyState, setCompanyState] = useState('');
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ── load clients + settings ──────────────────────────────────────────────
  useEffect(() => {
    async function loadMeta() {
      setIsLoadingMeta(true);
      try {
        const [clientsRes, settingsRes] = await Promise.all([
          clientsApi.getClients({ limit: 200 }),
          settingsApi.getSettings(),
        ]);
        const allClients = clientsRes.data.data.clients;
        setClients(allClients);
        setCompanyState(settingsRes.data.data.state || '');

        // defaults from settings
        const s = settingsRes.data.data;
        if (!isEdit) {
          if (s.defaultQuotationTerms) setTerms(s.defaultQuotationTerms);
          if (s.defaultPaymentConditions) setNotes(s.defaultPaymentConditions);
          if (s.defaultQuotationValidityDays) {
            setValidUntil(futureDateISO(s.defaultQuotationValidityDays));
          }
        }
      } catch {
        showToast('Failed to load clients or settings.', 'error');
      } finally {
        setIsLoadingMeta(false);
      }
    }
    loadMeta();
  }, []);

  // ── populate form for edit ───────────────────────────────────────────────
  useEffect(() => {
    if (!quotation) return;
    setClientId(quotation.client?._id || quotation.client || '');
    setIssueDate(quotation.issueDate?.slice(0, 10) || todayISO());
    setValidUntil(quotation.validUntil?.slice(0, 10) || futureDateISO(30));
    setItems(quotation.items?.length ? quotation.items.map((i) => ({
      description: i.description || '',
      sacCode: i.sacCode || '',
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount || 0,
      gstRate: i.gstRate ?? 18,
    })) : [{ ...EMPTY_ITEM }]);
    setTerms(quotation.terms || '');
    setNotes(quotation.notes || '');
  }, [quotation]);

  // ── keep selectedClient in sync ──────────────────────────────────────────
  useEffect(() => {
    setSelectedClient(clients.find((c) => c._id === clientId) || null);
  }, [clientId, clients]);

  // ── preview ──────────────────────────────────────────────────────────────
  const preview = calcPreview(
    items,
    selectedClient?.billingAddress?.state || selectedClient?.stateCode || '',
    companyState,
  );

  // ── item handlers ────────────────────────────────────────────────────────
  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    ));
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (idx) =>
    setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  // ── validate ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!clientId) errs.client = 'Client is required';
    if (!issueDate) errs.issueDate = 'Issue date is required';
    if (!validUntil) errs.validUntil = 'Valid until is required';
    items.forEach((item, idx) => {
      if (!item.description?.trim())
        errs[`items.${idx}.description`] = 'Description required';
      if (!item.quantity || item.quantity <= 0)
        errs[`items.${idx}.quantity`] = 'Quantity > 0';
      if (item.unitPrice == null || item.unitPrice < 0)
        errs[`items.${idx}.unitPrice`] = 'Unit price ≥ 0';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    const payload = {
      client: clientId,
      issueDate,
      validUntil,
      items: items.map((i) => ({
        description: i.description,
        sacCode: i.sacCode,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discount: Number(i.discount) || 0,
        gstRate: Number(i.gstRate),
      })),
      terms,
      notes,
    };
    try {
      if (isEdit) {
        await quotationsApi.updateQuotation(quotation._id, payload);
        showToast('Quotation updated.', 'success');
      } else {
        await quotationsApi.createQuotation(payload);
        showToast('Quotation created.', 'success');
      }
      onSaved();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Save failed.';
      const apiErrors = err?.response?.data?.errors;
      showToast(msg, 'error');
      if (apiErrors) {
        const mapped = {};
        apiErrors.forEach((e) => { if (e.field) mapped[e.field] = e.message; });
        setErrors(mapped);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  if (isLoadingMeta) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
        <span className="ml-3 text-sm text-slate-500">Loading…</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Header fields ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Client */}
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Client <span className="text-red-500">*</span>
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.client ? 'border-red-400' : 'border-slate-300'}`}
          >
            <option value="">— Select client —</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>{c.companyName}</option>
            ))}
          </select>
          {errors.client && <p className="mt-1 text-xs text-red-500">{errors.client}</p>}
        </div>

        {/* Issue Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Issue Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.issueDate ? 'border-red-400' : 'border-slate-300'}`}
          />
        </div>

        {/* Valid Until */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Valid Until <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.validUntil ? 'border-red-400' : 'border-slate-300'}`}
          />
        </div>
      </div>

      {/* ── Line Items ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700">Line Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <Plus size={13} /> Add Row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-left">
                <th className="px-2 py-2 border border-slate-200 min-w-[180px]">Description *</th>
                <th className="px-2 py-2 border border-slate-200 w-24">SAC Code</th>
                <th className="px-2 py-2 border border-slate-200 w-16">Qty *</th>
                <th className="px-2 py-2 border border-slate-200 w-24">Unit Price *</th>
                <th className="px-2 py-2 border border-slate-200 w-24">Discount</th>
                <th className="px-2 py-2 border border-slate-200 w-24">GST %</th>
                <th className="px-2 py-2 border border-slate-200 w-24 text-right">Amount</th>
                <th className="px-2 py-2 border border-slate-200 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const qty = parseFloat(item.quantity) || 0;
                const up = parseFloat(item.unitPrice) || 0;
                const disc = parseFloat(item.discount) || 0;
                const lineAmt = Math.max(0, qty * up - disc);

                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-1 py-1 border border-slate-200">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="Service / item description"
                        className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400
                          ${errors[`items.${idx}.description`] ? 'border-red-400' : 'border-slate-200'}`}
                      />
                    </td>
                    <td className="px-1 py-1 border border-slate-200">
                      <input
                        type="text"
                        value={item.sacCode}
                        onChange={(e) => updateItem(idx, 'sacCode', e.target.value)}
                        placeholder="998314"
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-1 py-1 border border-slate-200">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400
                          ${errors[`items.${idx}.quantity`] ? 'border-red-400' : 'border-slate-200'}`}
                      />
                    </td>
                    <td className="px-1 py-1 border border-slate-200">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400
                          ${errors[`items.${idx}.unitPrice`] ? 'border-red-400' : 'border-slate-200'}`}
                      />
                    </td>
                    <td className="px-1 py-1 border border-slate-200">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => updateItem(idx, 'discount', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-1 py-1 border border-slate-200">
                      <select
                        value={item.gstRate}
                        onChange={(e) => updateItem(idx, 'gstRate', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        {GST_RATES.map((r) => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1 border border-slate-200 text-right font-mono">
                      ₹{lineAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-1 py-1 border border-slate-200 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Live Preview (cosmetic — server is authoritative) */}
        <div className="mt-3 ml-auto w-full max-w-xs bg-slate-50 border border-slate-200 rounded-md p-3 text-xs space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-semibold mb-2">
            Preview (indicative only)
          </p>
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatINR(preview.subtotal)}</span>
          </div>
          {preview.totalDiscount > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Total Discount</span>
              <span>−{formatINR(preview.totalDiscount)}</span>
            </div>
          )}
          {preview.intrastate ? (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">CGST</span>
                <span>{formatINR(preview.cgst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SGST</span>
                <span>{formatINR(preview.sgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-slate-500">IGST</span>
              <span>{formatINR(preview.igst)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t border-slate-200 pt-1 mt-1 text-slate-900">
            <span>Grand Total</span>
            <span>{formatINR(preview.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* ── Terms & Notes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Terms &amp; Conditions
          </label>
          <textarea
            rows={4}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Payment terms, conditions…"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes for the client…"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving}>
          {isEdit ? 'Save Changes' : 'Create Quotation'}
        </Button>
      </div>
    </form>
  );
}
