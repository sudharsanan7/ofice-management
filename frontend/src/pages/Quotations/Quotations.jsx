import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Eye, FilePlus2, Mail, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import quotationsApi from '../../api/quotations.api';
import clientsApi from '../../api/clients.api';

const STATUSES = ['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'];
const BADGES = { draft: 'default', sent: 'info', accepted: 'success', rejected: 'danger', expired: 'warning' };
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(value) || 0);
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const messageForError = (error) => {
  if (error?.status === 401) return 'Your session expired. Please sign in again.';
  if (error?.status === 403) return 'You do not have permission to perform this action.';
  if (error?.status === 404) return 'The quotation could not be found.';
  if (error?.status >= 500) return 'OfficeFlow could not complete the request. Please try again.';
  return error?.message || 'The request could not be completed.';
};

export default function QuotationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState('all');
  const [client, setClient] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [sendTarget, setSendTarget] = useState(null);
  const [sendSubject, setSendSubject] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendCc, setSendCc] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    clientsApi.getClients({ limit: 100 }).then((res) => setClients(res.data?.clients || [])).catch(() => {});
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await quotationsApi.getQuotations({ page, limit: 10, status, search: search.trim(), client: client || undefined, startDate: startDate || undefined, endDate: endDate || undefined });
      setRows(result.data?.quotations || []);
      setPagination(result.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (requestError) {
      const message = messageForError(requestError);
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, status, search, client, startDate, endDate, showToast]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [status, search, client, startDate, endDate]);

  const download = async (quotation) => {
    try {
      const blob = await quotationsApi.downloadPDF(quotation._id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${quotation.quotationNumber.replace(/[\\/]/g, '-')}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) { showToast(messageForError(requestError), 'error'); }
  };

  const duplicate = async (quotation) => {
    try {
      const result = await quotationsApi.duplicateQuotation(quotation._id);
      showToast('Draft quotation duplicated.', 'success');
      navigate(`/quotations/${result.data._id}/edit`);
    } catch (requestError) { showToast(messageForError(requestError), 'error'); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await quotationsApi.deleteQuotation(deleteTarget._id);
      showToast('Quotation deleted.', 'success');
      setDeleteTarget(null);
      fetchRows();
    } catch (requestError) { showToast(messageForError(requestError), 'error'); }
    finally { setDeleting(false); }
  };

  const submitSend = async (event) => {
    event.preventDefault();
    if (!sendTarget) return;
    setSending(true);
    try {
      await quotationsApi.sendEmail(sendTarget._id, { subject: sendSubject || undefined, message: sendMessage || undefined, cc: sendCc.trim() || undefined });
      showToast('Quotation email sent.', 'success');
      setSendTarget(null);
      fetchRows();
    } catch (requestError) { showToast(messageForError(requestError), 'error'); }
    finally { setSending(false); }
  };

  const columns = [
    { header: 'Quotation #', key: 'quotationNumber', render: (item) => <Link className="font-mono font-semibold text-indigo-700 hover:underline" to={`/quotations/${item._id}`}>{item.quotationNumber}</Link> },
    { header: 'Client', key: 'client', render: (item) => <div><div className="font-medium text-slate-800">{item.client?.companyName || '—'}</div><div className="text-xs text-slate-500">{item.client?.contactPerson || ''}</div></div> },
    { header: 'Issue date', key: 'issueDate', render: (item) => date(item.issueDate) },
    { header: 'Valid until', key: 'validUntil', render: (item) => date(item.validUntil) },
    { header: 'Grand total', key: 'grandTotal', align: 'right', render: (item) => <strong>{money(item.grandTotal)}</strong> },
    { header: 'Status', key: 'status', render: (item) => <Badge variant={BADGES[item.status] || 'default'}>{item.status}</Badge> },
    { header: 'Actions', key: 'actions', align: 'right', render: (item) => {
      const owns = user?.role === 'admin' || String(item.createdBy?._id || item.createdBy) === String(user?._id || user?.id);
      return <div className="flex justify-end gap-1">
        <Link className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600" title="View" to={`/quotations/${item._id}`}><Eye size={16} /></Link>
        {item.status === 'draft' && owns && <Link className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600" title="Edit" to={`/quotations/${item._id}/edit`}><Pencil size={16} /></Link>}
        <button onClick={() => duplicate(item)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600" title="Duplicate"><FilePlus2 size={16} /></button>
        <button onClick={() => download(item)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600" title="Download PDF"><Download size={16} /></button>
        {['draft', 'sent'].includes(item.status) && owns && <button onClick={() => { setSendTarget(item); setSendSubject(`Quotation ${item.quotationNumber}`); setSendMessage('Please find your quotation attached.'); }} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600" title="Send email"><Mail size={16} /></button>}
        {item.status === 'draft' && owns && <button onClick={() => setDeleteTarget(item)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600" title="Delete"><Trash2 size={16} /></button>}
      </div>;
    } },
  ];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Quotations</h1><p className="mt-1 text-sm text-slate-500">Prepare, send and track client quotations.</p></div>
      <Button icon={Plus} onClick={() => navigate('/quotations/new')}>Create quotation</Button>
    </div>
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Input label="Search" name="quotation-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Number or client name" icon={Search} />
        <div><label htmlFor="quotation-status" className="mb-1 block text-xs font-semibold uppercase text-slate-700">Status</label><select id="quotation-status" value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{STATUSES.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></div>
        <div><label htmlFor="quotation-client" className="mb-1 block text-xs font-semibold uppercase text-slate-700">Client</label><select id="quotation-client" value={client} onChange={(event) => setClient(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All clients</option>{clients.map((value) => <option key={value._id} value={value._id}>{value.companyName}</option>)}</select></div>
        <Input label="From" name="quotation-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <Input label="To" name="quotation-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
      </div>
      {error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    </section>
    <Table columns={columns} data={rows} isLoading={loading} emptyMessage={error ? 'Unable to load quotations' : 'No quotations found'} emptySubtext={error ? 'Check your connection and try again.' : 'Adjust your filters or create a quotation.'} actionButton={!error ? <Button size="sm" onClick={() => navigate('/quotations/new')}>Create quotation</Button> : null} />
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"><span>{pagination.total || 0} quotation(s)</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</Button><span>Page {pagination.page || page} of {Math.max(1, pagination.totalPages || 1)}</span><Button variant="outline" size="sm" disabled={page >= (pagination.totalPages || 1) || loading} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>
    <ConfirmDialog isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} isLoading={deleting} title="Delete quotation" message={`Delete ${deleteTarget?.quotationNumber || 'this quotation'}? This cannot be undone.`} confirmText="Delete" />
    <Modal isOpen={Boolean(sendTarget)} onClose={() => !sending && setSendTarget(null)} title="Send quotation" subtitle={`Email PDF to ${sendTarget?.client?.email || 'the client'}`}>
      <form onSubmit={submitSend} className="space-y-4"><Input label="Subject" name="quotation-email-subject" value={sendSubject} onChange={(event) => setSendSubject(event.target.value)} /><Input label="Message" name="quotation-email-message" type="textarea" rows={4} value={sendMessage} onChange={(event) => setSendMessage(event.target.value)} /><Input label="CC (optional)" name="quotation-email-cc" type="email" value={sendCc} onChange={(event) => setSendCc(event.target.value)} placeholder="colleague@example.com" /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSendTarget(null)} disabled={sending}>Cancel</Button><Button type="submit" isLoading={sending} icon={Mail}>Send email</Button></div></form>
    </Modal>
  </div>;
}
