import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Receipt,
  FileSpreadsheet,
  History,
  Info,
  CreditCard,
  AlertCircle,
  Plus,
  Archive,
  CheckCircle2,
  Clock,
  MapPin
} from 'lucide-react';
import clientsApi from '../../api/clients.api';
import { useToast } from '../../components/common/Toast';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Spinner from '../../components/common/Spinner';

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchClientDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [resDetails, resActivity] = await Promise.all([
        clientsApi.getClientDetails(id),
        clientsApi.getClientActivity(id)
      ]);
      setClientData(resDetails.data);
      setActivities(resActivity.data);
    } catch (err) {
      showToast(err.message || 'Failed to load client details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchClientDetails();
  }, [fetchClientDetails]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500">Loading client profile & financial records...</p>
      </div>
    );
  }

  if (!clientData || !clientData.client) {
    return (
      <div className="p-8 text-center">
        <p className="text-base font-semibold text-slate-800">Client not found.</p>
        <Link to="/clients" className="mt-3 inline-flex text-indigo-600 text-sm font-medium">
          &larr; Back to Client Directory
        </Link>
      </div>
    );
  }

  const { client, quotations = [], invoices = [], totals = {} } = clientData;

  const quotationColumns = [
    {
      header: 'Quote #',
      key: 'quotationNumber',
      render: (q) => <span className="font-mono font-semibold text-slate-900">{q.quotationNumber}</span>
    },
    {
      header: 'Date Created',
      key: 'createdAt',
      render: (q) => <span className="text-xs text-slate-600">{formatDate(q.createdAt)}</span>
    },
    {
      header: 'Valid Until',
      key: 'validUntil',
      render: (q) => <span className="text-xs text-slate-600">{formatDate(q.validUntil)}</span>
    },
    {
      header: 'Total Amount',
      key: 'totalAmount',
      render: (q) => <span className="font-semibold text-slate-900">{formatCurrency(q.totalAmount)}</span>
    },
    {
      header: 'Status',
      key: 'status',
      render: (q) => (
        <Badge
          variant={
            q.status === 'accepted'
              ? 'success'
              : q.status === 'sent'
              ? 'info'
              : q.status === 'rejected'
              ? 'danger'
              : 'default'
          }
          size="sm"
          dot
        >
          {q.status?.toUpperCase()}
        </Badge>
      )
    }
  ];

  const invoiceColumns = [
    {
      header: 'Invoice #',
      key: 'invoiceNumber',
      render: (inv) => <span className="font-mono font-semibold text-slate-900">{inv.invoiceNumber}</span>
    },
    {
      header: 'Due Date',
      key: 'dueDate',
      render: (inv) => <span className="text-xs text-slate-600">{formatDate(inv.dueDate)}</span>
    },
    {
      header: 'Total Amount',
      key: 'totalAmount',
      render: (inv) => <span className="font-semibold text-slate-900">{formatCurrency(inv.totalAmount)}</span>
    },
    {
      header: 'Amount Paid',
      key: 'amountPaid',
      render: (inv) => <span className="text-xs text-emerald-600 font-medium">{formatCurrency(inv.amountPaid)}</span>
    },
    {
      header: 'Balance Due',
      key: 'balanceDue',
      render: (inv) => (
        <span className={`text-xs font-semibold ${inv.balanceDue > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
          {formatCurrency(inv.balanceDue)}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (inv) => (
        <Badge
          variant={
            inv.status === 'paid'
              ? 'success'
              : inv.status === 'partially_paid'
              ? 'warning'
              : inv.status === 'overdue'
              ? 'danger'
              : 'default'
          }
          size="sm"
          dot
        >
          {inv.status?.toUpperCase().replace('_', ' ')}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation */}
      <div>
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Clients
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-lg shadow-md shadow-indigo-100">
              {client.companyName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{client.companyName}</h1>
                <Badge variant={client.status === 'active' ? 'success' : 'default'} size="sm" dot>
                  {client.status?.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary Contact: <span className="font-semibold text-slate-700">{client.contactPerson}</span>
                {client.gstin && (
                  <span className="ml-3 font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700 font-medium">
                    GSTIN: {client.gstin} (State {client.stateCode || '—'})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={FileSpreadsheet}
              onClick={() => navigate('/quotations', { state: { clientId: client._id } })}
            >
              New Quotation
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Receipt}
              onClick={() => navigate('/invoices', { state: { clientId: client._id } })}
            >
              Create Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Billed</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(totals.totalBilled || 0)}</span>
            <span className="block text-xs font-medium text-slate-400 mt-1">{invoices.length} total invoice(s)</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Paid</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.totalPaid || 0)}</span>
            <span className="block text-xs font-medium text-emerald-700/60 mt-1">Cleared transactions</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Outstanding Balance</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold ${(totals.totalOutstanding || 0) > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {formatCurrency(totals.totalOutstanding || 0)}
            </span>
            <span className="block text-xs font-medium text-slate-400 mt-1">Pending settlement</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Overview & Profile', icon: Info },
            { id: 'quotations', name: `Quotations (${quotations.length})`, icon: FileSpreadsheet },
            { id: 'invoices', name: `Invoices (${invoices.length})`, icon: Receipt },
            { id: 'activity', name: `Activity Trail (${activities.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-all ${
                  active
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
              Contact & Registration Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Company Legal Name</span>
                <span className="text-slate-800 text-sm font-semibold">{client.companyName}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block font-medium">Contact Person</span>
                  <span className="text-slate-800 font-medium">{client.contactPerson}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Phone</span>
                  <span className="text-slate-800 font-medium">{client.phone || '—'}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Email Address</span>
                <span className="text-indigo-600 font-medium">{client.email}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block font-medium">CIN</span>
                  <span className="text-slate-800 font-mono font-medium">{client.cin || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">GSTIN</span>
                  <span className="text-slate-800 font-mono font-medium">{client.gstin || 'Unregistered'}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">State Code (Tax Calculation)</span>
                <span className="text-slate-800 font-semibold">
                  {client.stateCode ? `Code ${client.stateCode} (${client.billingAddress?.state || 'Local'})` : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-600" /> Billing Address
            </h3>

            <div className="text-xs space-y-2 text-slate-700">
              <p className="font-medium text-slate-800">
                {client.billingAddress?.line1 || 'No street address specified'}
              </p>
              {client.billingAddress?.line2 && <p>{client.billingAddress.line2}</p>}
              <p>
                {[
                  client.billingAddress?.city,
                  client.billingAddress?.state,
                  client.billingAddress?.pincode
                ]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-xs font-semibold text-slate-900 block">Client Notes</span>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                {client.notes || 'No internal notes recorded for this client.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Quotations */}
      {activeTab === 'quotations' && (
        <Table
          columns={quotationColumns}
          data={quotations}
          emptyMessage="No quotations generated for this client"
          emptySubtext="Draft your first proposal or quote for this account."
          actionButton={
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/quotations', { state: { clientId: client._id } })}
            >
              Draft Quotation
            </Button>
          }
        />
      )}

      {/* Tab 3: Invoices */}
      {activeTab === 'invoices' && (
        <Table
          columns={invoiceColumns}
          data={invoices}
          emptyMessage="No invoices billed to this client"
          emptySubtext="Create an invoice or convert an accepted quotation."
          actionButton={
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/invoices', { state: { clientId: client._id } })}
            >
              Create Invoice
            </Button>
          }
        />
      )}

      {/* Tab 4: Activity Trail */}
      {activeTab === 'activity' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100 mb-4">
            Audit Trail & History
          </h3>

          {activities.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No historical activity recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {activities.map((act) => (
                <div key={act._id} className="flex items-start gap-3 pb-3 border-b border-slate-50 text-xs">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 mt-0.5">
                    <History className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {act.action} {act.entity}
                      </span>
                      <span className="text-slate-400 text-[11px]">{formatDateTime(act.timestamp)}</span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      Performed by: <span className="font-medium text-slate-700">{act.user?.name || 'System'}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
