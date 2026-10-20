import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useToast } from '../../components/common/Toast';
import apiClient from '../../api/client';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      showToast('Password reset link is missing its token. Request a new link.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/reset-password', { token, password });
      showToast(response.message || 'Password reset successfully. Please sign in.', 'success');
      navigate('/login');
    } catch (error) {
      showToast(error.message || 'Unable to reset password.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-200">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </Link>

        <h2 className="text-xl font-bold tracking-tight text-slate-900">Reset Your Password</h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter a new secure password for your OfficeFlow account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="New Password"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
