import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Badge from '../common/Badge';
import notificationsApi from '../../api/notifications.api';
import { formatDateTime } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    notificationsApi.getNotifications({ limit: 10 })
      .then((response) => {
        setNotifications(response.data?.notifications || []);
        setUnreadCount(response.data?.unreadCount || 0);
      })
      .catch((error) => showToast(error.message || 'Unable to load notifications.', 'error'));
  }, [showToast]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      showToast(error.message || 'Unable to complete server sign out.', 'error');
    } finally {
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden focus:outline-none"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden md:block w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search records, invoices, clients..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User Role Badge */}
        {user?.role === 'admin' ? (
          <Badge variant="purple" size="sm" dot>
            Admin
          </Badge>
        ) : (
          <Badge variant="default" size="sm" dot>
            Team Member
          </Badge>
        )}

        {/* Notifications */}
        <div className="relative">
        <button
          onClick={() => setNotificationsOpen((open) => !open)}
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none"
          title="Notifications"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        {notificationsOpen && <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3"><span className="text-sm font-semibold text-slate-800">Notifications</span>{unreadCount > 0 && <button className="text-xs font-medium text-indigo-600 hover:underline" onClick={() => notificationsApi.markAllRead().then(() => { setNotifications((items) => items.map((item) => ({ ...item, read: true }))); setUnreadCount(0); }).catch((error) => showToast(error.message || 'Unable to mark notifications read.', 'error'))}>Mark all read</button>}</div>
          <div className="max-h-80 overflow-y-auto">{notifications.length ? notifications.map((notification) => <button key={notification._id} onClick={() => { if (!notification.read) notificationsApi.markRead(notification._id).then(() => { setNotifications((items) => items.map((item) => item._id === notification._id ? { ...item, read: true } : item)); setUnreadCount((count) => Math.max(0, count - 1)); }).catch((error) => showToast(error.message || 'Unable to mark notification read.', 'error')); setNotificationsOpen(false); }} className={`block w-full border-b px-4 py-3 text-left hover:bg-slate-50 ${notification.read ? '' : 'bg-indigo-50/50'}`}><span className="block text-sm font-medium text-slate-800">{notification.title}</span><span className="mt-1 block text-xs text-slate-600">{notification.message}</span><span className="mt-1 block text-[11px] text-slate-400">{formatDateTime(notification.createdAt)}</span></button>) : <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications.</p>}</div>
        </div>}
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* Profile Link */}
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          title="My Profile"
        >
          <User className="h-4 w-4 text-slate-500" />
          <span className="hidden sm:inline font-semibold">{user?.name || 'Profile'}</span>
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
