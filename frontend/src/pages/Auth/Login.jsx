import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Mail, Lock, ShieldCheck, UserRound } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    const normalizedPassword = password;

    if (!normalizedEmail || !normalizedPassword) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    const result = await login(normalizedEmail, normalizedPassword, role);
    if (result.success) {
      navigate('/');
      return;
    }

    showToast(result.message || 'Invalid email or password', 'error');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-200">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Briefcase className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Sign in to OfficeFlow</h2>
          <p className="mt-1 text-xs text-slate-500">Centralized office management platform</p>
        </div>

        <div
          className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"
          role="tablist"
          aria-label="Choose account type"
        >
          {[
            { id: 'admin', label: 'Admin Login', icon: ShieldCheck },
            { id: 'team_member', label: 'Employee Login', icon: UserRound }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={role === id}
              onClick={() => setRole(id)}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                role === id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Email Address"
            type="email"
            name="email"
            icon={Mail}
            placeholder={role === 'admin' ? 'admin@company.com' : 'employee@company.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            name="password"
            icon={Lock}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
            Sign In as {role === 'admin' ? 'Admin' : 'Employee'}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-400">
            Need an account? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
