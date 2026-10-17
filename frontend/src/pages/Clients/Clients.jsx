import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users2,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Archive,
  RefreshCw,
  Mail,
  Phone,
  Building,
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import clientsApi from '../../api/clients.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export default function ClientsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Deletion & Archive Dialog States
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [clientToArchive, setClientToArchive] = useState(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    cin: '',
    gstin: '',
    billingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: 'Tamil Nadu',
      pincode: ''
    },
    notes: ''
  });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientsApi.getClients({
        search,
        status: statusFilter,
        page: pagination.page,
        limit: pagination.limit
      });
      setClients(res.data.clients);
      setPagination(res.data.pagination);
    } catch (err) {
      showToast(err.message || 'Failed to fetch clients', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pagination.page, pagination.limit, showToast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setFormData({
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      cin: '',
      gstin: '',
      billingAddress: {
        line1: '',
        line2: '',
        city: '',
        state: 'Tamil Nadu',
        pincode: ''
      },
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client) => {
    setEditingClient(client);
    setFormData({
      companyName: client.companyName || '',
      contactPerson: client.contactPerson || '',
      email: client.email || '',
      phone: client.phone || '',
      cin: client.cin || '',
      gstin: client.gstin || '',
      billingAddress: {
        line1: client.billingAddress?.line1 || '',
        line2: client.billingAddress?.line2 || '',
        city: client.billingAddress?.city || '',
        state: client.billingAddress?.state || 'Tamil Nadu',
        pincode: client.billingAddress?.pincode || ''
      },
      notes: client.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate GSTIN if entered
    if (formData.gstin && !GSTIN_REGEX.test(formData.gstin.trim())) {
      showToast('Invalid GSTIN format. Expected 15 characters (e.g. 33AAAAA0000A1Z5)', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingClient) {
        await clientsApi.updateClient(editingClient._id, formData);
        showToast('Client details updated successfully', 'success');
      } else {
        await clientsApi.createClient(formData);
        showToast('New client created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (err) {
      showToast(err.message || 'Error saving client', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (client) => {
    setClientToDelete(client);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setSubmitting(true);
    try {
      await clientsApi.deleteClient(clientToDelete._id);
      showToast('Client deleted successfully', 'success');
      setIsDeleteConfirmOpen(false);
      fetchClients();
    } catch (err) {
      // If error message indicates client has invoices, close delete dialog and offer archive dialog
      setIsDeleteConfirmOpen(false);
      showToast(err.message || 'Cannot delete client with recorded invoices.', 'error');
      if (err.message && err.message.toLowerCase().includes('archive')) {
        setClientToArchive(clientToDelete);
        setIsArchiveConfirmOpen(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!clientToArchive) return;
    setSubmitting(true);
    const newStatus = clientToArchive.status === 'archived' ? 'active' : 'archived';
    try {
      await clientsApi.setClientStatus(clientToArchive._id, newStatus);
      showToast(`Client ${newStatus === 'archived' ? 'archived' : 'restored'} successfully`, 'success');
      setIsArchiveConfirmOpen(false);
      fetchClients();
    } catch (err) {
      showToast(err.message || 'Failed to update client status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isGstinValid = !formData.gstin || GSTIN_REGEX.test(formData.gstin.trim());
  const derivedStateCode = formData.gstin && formData.gstin.length >= 2 ? formData.gstin.substring(0, 2) : '';

  const columns = [
    {
      header: 'Company & Contact',
      key: 'companyName',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm border border-indigo-100">
            {row.companyName.charAt(0).toUpperCase()}
          </div>
          <div>
            <Link
              to={`/clients/${row._id}`}
              className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-1 group"
            >
              {row.companyName}
              <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
            </Link>
            <div className="text-xs text-slate-500">{row.contactPerson}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Contact Info',
      key: 'contact',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="text-slate-700 flex items-center gap-1">
            <Mail className="w-3 h-3 text-slate-400" /> {row.email}
          </div>
          {row.phone && (
            <div className="text-slate-500 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" /> {row.phone}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'GSTIN & State',
      key: 'gstin',
      render: (row) => (
        <div className="text-xs">
          {row.gstin ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-medium text-slate-800">{row.gstin}</span>
              {row.stateCode && (
                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                  State {row.stateCode}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 italic">Unregistered</span>
          )}
          <div className="text-[11px] text-slate-500">{row.billingAddress?.city || row.billingAddress?.state || '—'}</div>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'default'} size="sm" dot>
          {row.status === 'active' ? 'Active' : 'Archived'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/clients/${row._id}`)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="View Details"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit Client"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setClientToArchive(row);
              setIsArchiveConfirmOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title={row.status === 'archived' ? 'Restore Client' : 'Archive Client'}
          >
            <Archive className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button
              onClick={() => handleDeleteClick(row)}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Client"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Client Directory</h1>
            <Badge variant="primary" size="sm">Module 6</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage client profiles, GSTIN registrations, and view linked quotations and invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchClients} disabled={loading}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreateModal}>
            Add Client
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search by company, contact person, email, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="active">Active Clients</option>
          <option value="archived">Archived Clients</option>
          <option value="all">All Clients</option>
        </select>
      </div>

      {/* Clients Table */}
      <Table
        columns={columns}
        data={clients}
        isLoading={loading}
        emptyMessage="No client records found"
        emptySubtext="Add your first client to start creating quotations and invoices."
        actionButton={
          <Button variant="outline" size="sm" icon={Plus} onClick={handleOpenCreateModal}>
            Add First Client
          </Button>
        }
      />

      {/* Create / Edit Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? `Edit ${editingClient.companyName}` : 'Add New Client'}
        subtitle="Provide billing information and GST tax registration details"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. Acme Corp Ltd"
              required
            />
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="billing@company.com"
              required
            />
            <Input
              label="Phone Number"
              icon={Phone}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="CIN (Optional)"
              value={formData.cin}
              onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
              placeholder="U72900TN2026PTC123456"
            />
            <div>
              <Input
                label="GSTIN Number (Optional)"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="33AAAAA0000A1Z5"
                error={!isGstinValid ? 'Must be valid 15-character GSTIN' : undefined}
                helperText={
                  derivedStateCode ? `State Code extracted: ${derivedStateCode}` : 'Format: 2-digit state code + PAN + entity + check'
                }
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Billing Address
            </span>
            <Input
              label="Address Line 1"
              value={formData.billingAddress.line1}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: { ...formData.billingAddress, line1: e.target.value }
                })
              }
              placeholder="Street Address, Building, Floor"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <Input
                label="City"
                value={formData.billingAddress.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    billingAddress: { ...formData.billingAddress, city: e.target.value }
                  })
                }
                placeholder="Chennai"
              />
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  State
                </label>
                <select
                  value={formData.billingAddress.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, state: e.target.value }
                    })
                  }
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <Input
                label="PIN Code"
                value={formData.billingAddress.pincode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    billingAddress: { ...formData.billingAddress, pincode: e.target.value }
                  })
                }
                placeholder="600001"
              />
            </div>
          </div>

          <Input
            type="textarea"
            label="Internal Client Notes"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Key preferences, payment cycle details, or special agreements..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {editingClient ? 'Save Changes' : 'Create Client'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={submitting}
        title="Delete Client"
        message={`Are you sure you want to permanently delete "${clientToDelete?.companyName}"? Clients with existing invoices cannot be deleted.`}
        confirmText="Delete Client"
        variant="danger"
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isArchiveConfirmOpen}
        onClose={() => setIsArchiveConfirmOpen(false)}
        onConfirm={handleConfirmArchive}
        isLoading={submitting}
        title={clientToArchive?.status === 'archived' ? 'Restore Client' : 'Archive Client'}
        message={
          clientToArchive?.status === 'archived'
            ? `Do you want to restore "${clientToArchive?.companyName}" to active status?`
            : `Do you want to archive "${clientToArchive?.companyName}"? Archived clients are preserved for reporting and financial integrity but hidden from daily lookups.`
        }
        confirmText={clientToArchive?.status === 'archived' ? 'Restore' : 'Archive'}
        variant={clientToArchive?.status === 'archived' ? 'primary' : 'warning'}
      />
    </div>
  );
}
