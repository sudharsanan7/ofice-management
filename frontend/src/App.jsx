import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';

// Pages
import Dashboard from './pages/Dashboard/Dashboard';
import CalendarPage from './pages/Calendar/Calendar';
import ClientsPage from './pages/Clients/Clients';
import ClientDetails from './pages/Clients/ClientDetails';
import QuotationsPage from './pages/Quotations/Quotations';
import InvoicesPage from './pages/Invoices/Invoices';
import PaymentsPage from './pages/Payments/Payments';
import ExpensesPage from './pages/Expenses/Expenses';
import ReportsPage from './pages/Reports/Reports';
import UsersPage from './pages/Users/Users';
import ProfilePage from './pages/Profile/Profile';
import SettingsPage from './pages/Settings/Settings';
import ActivityLogsPage from './pages/Logs/ActivityLogs';
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Main App Layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetails />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="logs" element={<ActivityLogsPage />} />
              <Route path="404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
