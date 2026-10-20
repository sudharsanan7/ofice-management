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
import QuotationFormPage from './pages/Quotations/QuotationFormPage';
import QuotationDetailPage from './pages/Quotations/QuotationDetailPage';
import InvoicesPage from './pages/Invoices/Invoices';
import PaymentsPage from './pages/Payments/Payments';
import ExpensesPage from './pages/Expenses/Expenses';
import UsersPage from './pages/Users/Users';
import ProfilePage from './pages/Profile/Profile';
import SettingsPage from './pages/Settings/Settings';
import ActivityLogsPage from './pages/Logs/ActivityLogs';
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import NotFound from './pages/NotFound';
import { useAuth } from './context/AuthContext';
import Spinner from './components/common/Spinner';

const ReportsPage = React.lazy(() => import('./pages/Reports/Reports'));

function ProtectedLayout() {
  const { token, loading } = useAuth();
  if (loading) return null;
  const hasValidSession = !!token && token !== 'mock_dev_token';
  return hasValidSession ? <Layout /> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

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
            <Route path="/" element={<ProtectedLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetails />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="quotations/new" element={<QuotationFormPage />} />
              <Route path="quotations/:id/edit" element={<QuotationFormPage />} />
              <Route path="quotations/:id" element={<QuotationDetailPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="reports" element={<React.Suspense fallback={<div className="flex justify-center py-20"><Spinner size="lg" /></div>}><ReportsPage /></React.Suspense>} />
              <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
              <Route path="logs" element={<AdminRoute><ActivityLogsPage /></AdminRoute>} />
              <Route path="404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
