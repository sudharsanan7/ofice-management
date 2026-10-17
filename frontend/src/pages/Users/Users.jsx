import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  Edit2,
  Power,
  Mail,
  Phone,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import usersApi from '../../api/users.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [userToToggleStatus, setUserToToggleStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    designation: 'Team Member',
    role: 'team_member'
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.getUsers({
        search,
        status: statusFilter,
        role: roleFilter,
        page: pagination.page,
        limit: pagination.limit
      });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load team members');
      showToast(err.message || 'Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, pagination.page, pagination.limit, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      designation: 'Team Member',
      role: 'team_member'
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      designation: user.designation || 'Team Member',
      role: user.role
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersApi.createUser(formData);
      showToast('Team member added successfully. Setup email dispatched.', 'success');
      setIsCreateModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await usersApi.updateUser(selectedUser._id, {
        name: formData.name,
        phone: formData.phone,
        designation: formData.designation,
        role: formData.role
      });
      showToast('User details updated successfully', 'success');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatusClick = (user) => {
    setUserToToggleStatus(user);
    setIsStatusConfirmOpen(true);
  };

  const handleConfirmStatusToggle = async () => {
    if (!userToToggleStatus) return;
    setSubmitting(true);
    const newStatus = userToToggleStatus.status === 'active' ? 'inactive' : 'active';
    try {
      await usersApi.updateUserStatus(userToToggleStatus._id, newStatus);
      showToast(`User status changed to ${newStatus}`, 'success');
      setIsStatusConfirmOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Member',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Designation',
      key: 'designation',
      render: (row) => <span className="text-xs font-medium text-slate-700">{row.designation || 'Team Member'}</span>
    },
    {
      header: 'Contact',
      key: 'phone',
      render: (row) => <span className="text-xs text-slate-600">{row.phone || '—'}</span>
    },
    {
      header: 'Role',
      key: 'role',
      render: (row) => (
        <Badge variant={row.role === 'admin' ? 'purple' : 'default'} size="sm" dot>
          {row.role === 'admin' ? 'Administrator' : 'Team Member'}
        </Badge>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'danger'} size="sm" dot>
          {row.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (row) => {
        const isSelf = currentUser?._id === row._id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => handleOpenEditModal(row)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Edit Member"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleToggleStatusClick(row)}
              disabled={isSelf && row.status === 'active'}
              className={`p-1.5 rounded-lg transition-colors ${
                row.status === 'active'
                  ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
              } ${isSelf && row.status === 'active' ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={
                isSelf && row.status === 'active'
                  ? 'Cannot deactivate your own account'
                  : row.status === 'active'
                  ? 'Deactivate Account'
                  : 'Activate Account'
              }
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Member Management</h1>
            <Badge variant="purple" size="sm">Admin Only</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage organization staff accounts, assign administrative privileges, and monitor account status
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreateModal}>
            Add Team Member
          </Button>
        )}
      </div>

      {/* Backend Enforcement Security Banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
        <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
        <div>
          <span className="font-semibold">Strict Backend Enforcement: </span>
          All permission checks, role demotion protection, and account status updates are validated on the server.
          Admins cannot deactivate themselves and the last active administrator cannot be demoted.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search by name, email, or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Roles</option>
          <option value="admin">Administrator</option>
          <option value="team_member">Team Member</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      <Table
        columns={columns}
        data={users}
        isLoading={loading}
        emptyMessage="No team members found"
        emptySubtext="Try adjusting your search criteria or add a new team member."
        actionButton={
          isAdmin && (
            <Button variant="outline" size="sm" icon={Plus} onClick={handleOpenCreateModal}>
              Add Team Member
            </Button>
          )
        }
      />

      {/* Create Team Member Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Team Member"
        subtitle="A welcome invitation with account setup link will be dispatched to their email."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            placeholder="e.g. John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            icon={Mail}
            placeholder="john@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              name="phone"
              icon={Phone}
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Input
              label="Designation"
              name="designation"
              icon={Briefcase}
              placeholder="e.g. Project Manager"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Role & Permissions
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="team_member">Team Member (Permitted business modules)</option>
              <option value="admin">Administrator (Full system & user access)</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Note: Role is forced to Team Member by default unless an administrator explicitly elevates it.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Create & Send Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Team Member"
        subtitle={`Updating details for ${selectedUser?.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            disabled
            helperText="Email address cannot be changed."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Input
              label="Designation"
              name="designation"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="team_member">Team Member</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Toggle Confirm Dialog */}
      <ConfirmDialog
        isOpen={isStatusConfirmOpen}
        onClose={() => setIsStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusToggle}
        isLoading={submitting}
        title={userToToggleStatus?.status === 'active' ? 'Deactivate Team Member' : 'Activate Team Member'}
        message={
          userToToggleStatus?.status === 'active'
            ? `Are you sure you want to deactivate ${userToToggleStatus?.name}? They will lose access to OfficeFlow until reactivated.`
            : `Are you sure you want to reactivate ${userToToggleStatus?.name}? They will regain access to their assigned modules.`
        }
        confirmText={userToToggleStatus?.status === 'active' ? 'Deactivate' : 'Activate'}
        variant={userToToggleStatus?.status === 'active' ? 'danger' : 'primary'}
      />
    </div>
  );
}
