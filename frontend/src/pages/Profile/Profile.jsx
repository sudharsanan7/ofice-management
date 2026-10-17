import React, { useState, useEffect } from 'react';
import { User, Shield, Lock, Phone, Briefcase, Mail, Key, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import usersApi from '../../api/users.api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  // Profile Form State
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    role: '',
    status: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        designation: user.designation || '',
        role: user.role || 'team_member',
        status: user.status || 'active'
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await usersApi.updateProfile({
        name: profileData.name,
        phone: profileData.phone,
        designation: profileData.designation
      });
      updateUser(res.data);
      showToast('Profile information updated successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      await usersApi.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      showToast('Password updated successfully', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.message || 'Failed to change password. Check your current password.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Profile & Account Security</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your personal information and update your login credentials</p>
      </div>

      {/* Backend RBAC & Whitelisting Security Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
        <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Server-Side Authorization & Mass Assignment Guard: </span>
          Your account role is currently{' '}
          <Badge variant={user?.role === 'admin' ? 'purple' : 'default'} size="sm">
            {user?.role === 'admin' ? 'Administrator' : 'Team Member'}
          </Badge>
          . Profile updates strictly whitelist <code className="bg-white px-1 py-0.5 rounded border border-slate-200">name</code>, <code className="bg-white px-1 py-0.5 rounded border border-slate-200">phone</code>, and <code className="bg-white px-1 py-0.5 rounded border border-slate-200">designation</code>. Any client-side elevation attempts on role, status, or email are discarded by the server.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Profile Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Personal Details</h2>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <Input
              label="Full Name"
              name="name"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              required
            />

            <Input
              label="Email Address (Read-Only)"
              type="email"
              name="email"
              icon={Mail}
              value={profileData.email}
              disabled
              helperText="Email is bound to your account identity and cannot be altered."
            />

            <Input
              label="Phone Number"
              name="phone"
              icon={Phone}
              placeholder="+91 98765 43210"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
            />

            <Input
              label="Designation / Title"
              name="designation"
              icon={Briefcase}
              placeholder="e.g. Senior Developer"
              value={profileData.designation}
              onChange={(e) => setProfileData({ ...profileData, designation: e.target.value })}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" isLoading={profileLoading}>
                Save Profile
              </Button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Lock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              name="currentPassword"
              icon={Key}
              placeholder="••••••••"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              required
            />

            <Input
              label="New Password"
              type="password"
              name="newPassword"
              icon={Key}
              placeholder="••••••••"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              helperText="Minimum 6 characters."
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
              icon={Key}
              placeholder="••••••••"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              required
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" isLoading={passwordLoading}>
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
