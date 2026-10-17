import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users2,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Wallet,
  BarChart3,
  UserCheck,
  Settings,
  History,
  Briefcase,
  X
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'Clients', path: '/clients', icon: Users2 },
  { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet },
  { name: 'Invoices', path: '/invoices', icon: Receipt },
  { name: 'Payments', path: '/payments', icon: CreditCard },
  { name: 'Expenses', path: '/expenses', icon: Wallet },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Team Members', path: '/users', icon: UserCheck, adminOnly: true },
  { name: 'Activity Logs', path: '/logs', icon: History, adminOnly: true },
  { name: 'Settings', path: '/settings', icon: Settings, adminOnly: true },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">OfficeFlow</span>
              <span className="block text-[10px] font-semibold tracking-wider uppercase text-indigo-600">Enterprise</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
            Workspace
          </p>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
                {item.adminOnly && (
                  <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Info / Footer */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-semibold text-slate-900">Admin User</p>
              <p className="truncate text-[11px] text-slate-500">admin@officeflow.local</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
