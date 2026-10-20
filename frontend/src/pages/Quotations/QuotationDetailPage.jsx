import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, Mail, Pencil, X } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import quotationsApi from '../../api/quotations.api';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(value) || 0);
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const statusVariant = { draft: 'default', sent: 'info', accepted: 'success', rejected: 'danger', expired: 'warning' };

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [cc, setCc] = useState('');
  const owns = user?.role === 'admin' || String(quotation?.createdBy?._id || quotation?.createdBy) === String(user?._id || user?.id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await quotationsApi.getQuotationById(id);
      setQuotation(result.data);
    } catch (error) {
      const text = error?.status === 404 ? 'Quotation not found.' : error?.status === 403 ? 'You do not have permission to view this quotation.' : error?.message || 'Unable to load quotation.';
      showToast(text, 'error');
      navigate('/quotations', { replace: true });
    } finally { setLoading(false); }
  }, [id, navigate, showToast]);
  useEffect(() => { load(); }, [load]);

  const download = async () => {
    try {
      const blob = await quotationsApi.downloadPDF(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${quotation.quotationNumber.replace(/[\\/]/g, '-')}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) { showToast(error?.message || 'PDF download failed.', 'error'); }
  };

  const updateStatus = async (nextStatus) => {
    setBusy(true);
    try {
      await quotationsApi.updateStatus(id, nextStatus);
      showToast(`Quotation marked ${nextStatus}.`, 'success');
      await load();
    } catch (error) { showToast(error?.message || 'Unable to change quotation status.', 'error'); }
    finally { setBusy(false); }
  };

  const duplicate = async () => {
    setBusy(true);
    try {
      const result = await quotationsApi.duplicateQuotation(id);
      showToast('Quotation duplicated as a new draft.', 'success');
      navigate(`/quotations/${result.data._id}/edit`);
    } catch (error) { showToast(error?.message || 'Unable to duplicate quotation.', 'error'); }
    finally { setBusy(false); }
  };

  const send = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await quotationsApi.sendEmail(id, { subject: subject || undefined, message: message || undefined, cc: cc.trim() || undefined });
      showToast('Quotation email sent.', 'success');
      setSendOpen(false);
      await load();
    } catch (error) { showToast(error?.message || 'Email could not be sent.', 'error'); }
    finally { setBusy(false); }
  };

  if (loading || !quotation) return <div className="flex justify-center py-20"><Spinner /></div>;
  const taxes = quotation.taxType === 'inter' ? [['IGST', quotation.igstTotal ?? quotation.igst]] : [['CGST', quotation.cgstTotal ?? quotation.cgst], ['SGST', quotation.sgstTotal ?? quotation.sgst]];

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4"><div className="flex items-start gap-3"><Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/quotations')}>Back</Button><div><h1 className="text-2xl font-bold text-slate-900">{quotation.quotationNumber}</h1><div className="mt-2 flex items-center gap-2"><Badge variant={statusVariant[quotation.status] || 'default'}>{quotation.status}</Badge><span className="text-sm text-slate-500">{quotation.client?.companyName}</span></div></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" icon={Download} onClick={download}>Download PDF</Button>{['draft', 'sent'].includes(quotation.status) && owns && <Button variant="outline" icon={Mail} onClick={() => { setSubject(`Quotation ${quotation.quotationNumber}`); setMessage('Please find your quotation attached.'); setSendOpen(true); }}>Send email</Button>}{quotation.status === 'draft' && owns && <Button variant="outline" icon={Pencil} onClick={() => navigate(`/quotations/${id}/edit`)}>Edit</Button>}{quotation.status === 'accepted' && <Link to={`/invoices?quotationId=${id}`} className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Convert to Invoice</Link>}<Button variant="outline" icon={Copy} disabled={busy} onClick={duplicate}>Duplicate</Button>{quotation.status === 'sent' && owns && <><Button variant="success" icon={Check} isLoading={busy} onClick={() => updateStatus('accepted')}>Mark accepted</Button><Button variant="danger" icon={X} disabled={busy} onClick={() => updateStatus('rejected')}>Mark rejected</Button></>}</div></div>
    <div className="grid gap-4 md:grid-cols-2"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-700">Quotation details</h2><dl className="grid grid-cols-2 gap-y-2 text-sm"><dt className="text-slate-500">Issue date</dt><dd>{date(quotation.issueDate)}</dd><dt className="text-slate-500">Valid until</dt><dd>{date(quotation.validUntil)}</dd><dt className="text-slate-500">Tax type</dt><dd>{quotation.taxType === 'inter' ? 'IGST — inter-state' : 'CGST + SGST — intra-state'}</dd><dt className="text-slate-500">Created by</dt><dd>{quotation.createdBy?.name || '—'}</dd></dl></section><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-700">Receiver</h2><p className="font-semibold text-slate-900">{quotation.client?.companyName || '—'}</p><p className="text-sm text-slate-600">{quotation.client?.contactPerson}</p><p className="text-sm text-slate-600">{quotation.client?.email}</p><p className="mt-2 text-sm text-slate-600">{[quotation.client?.billingAddress?.line1, quotation.client?.billingAddress?.line2, quotation.client?.billingAddress?.city, quotation.client?.billingAddress?.state, quotation.client?.billingAddress?.pincode].filter(Boolean).join(', ') || '—'}</p><p className="mt-1 text-sm text-slate-600">{quotation.client?.cin && `CIN: ${quotation.client.cin} `}{quotation.client?.gstin && `GSTIN: ${quotation.client.gstin}`}</p></section></div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Items</h2></div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['#', 'Description', 'SAC', 'Qty', 'Unit price', 'Discount', ...(quotation.taxType === 'inter' ? ['IGST'] : ['CGST', 'SGST']), 'Line total'].map((heading) => <th key={heading} className="px-4 py-3 text-left">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{(quotation.items || []).map((item, index) => <tr key={item._id || index}><td className="px-4 py-3">{index + 1}</td><td className="max-w-sm whitespace-normal px-4 py-3">{item.description}</td><td className="px-4 py-3">{item.sacCode || '—'}</td><td className="px-4 py-3">{item.quantity}</td><td className="px-4 py-3">{money(item.unitPrice)}</td><td className="px-4 py-3">{money(item.discount)}</td>{quotation.taxType === 'inter' ? <td className="px-4 py-3">{money(item.igst)}</td> : <><td className="px-4 py-3">{money(item.cgst)}</td><td className="px-4 py-3">{money(item.sgst)}</td></>}<td className="px-4 py-3 font-semibold">{money(item.lineTotal)}</td></tr>)}</tbody></table></div><div className="ml-auto max-w-sm space-y-2 px-5 py-5 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(quotation.subtotal)}</span></div><div className="flex justify-between"><span>Discount</span><span>− {money(quotation.totalDiscount)}</span></div>{taxes.map(([label, value]) => <div className="flex justify-between" key={label}><span>{label}</span><span>{money(value)}</span></div>)}<div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold"><span>Grand total</span><span>{money(quotation.grandTotal)}</span></div></div></section>
    {quotation.terms && <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-2 font-semibold text-slate-900">Terms &amp; Conditions</h2><p className="whitespace-pre-wrap text-sm text-slate-600">{quotation.terms}</p></section>}{quotation.notes && <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-2 font-semibold text-slate-900">Notes</h2><p className="whitespace-pre-wrap text-sm text-slate-600">{quotation.notes}</p></section>}
    <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-semibold text-slate-900">Status history</h2><ol className="space-y-4">{(quotation.statusHistory || []).map((entry, index) => <li key={`${entry.status}-${entry.changedAt}-${index}`} className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" /><div><p className="text-sm font-medium capitalize text-slate-800">{entry.status}</p><p className="text-xs text-slate-500">{date(entry.changedAt)}{entry.changedBy?.name ? ` · ${entry.changedBy.name}` : ''}</p></div></li>)}</ol></section>
    <Modal isOpen={sendOpen} onClose={() => !busy && setSendOpen(false)} title="Send quotation" subtitle={`PDF will be sent to ${quotation.client?.email || 'the client'}`}><form onSubmit={send} className="space-y-4"><Input label="Subject" name="send-subject" value={subject} onChange={(event) => setSubject(event.target.value)} /><Input label="Message" name="send-message" type="textarea" value={message} onChange={(event) => setMessage(event.target.value)} rows={4} /><Input label="CC (optional)" name="send-cc" type="email" value={cc} onChange={(event) => setCc(event.target.value)} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSendOpen(false)} disabled={busy}>Cancel</Button><Button type="submit" isLoading={busy}>Send</Button></div></form></Modal>
  </div>;
}
