import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Main Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import DonationsPage from './pages/donations/DonationsPage';
import CreateDonationPage from './pages/donations/CreateDonationPage';
import DonationDetailPage from './pages/donations/DonationDetailPage';

// NGO Pages
import BrowseDonationsPage from './pages/ngo/BrowseDonationsPage';
import ClaimsPage from './pages/ngo/ClaimsPage';

// Volunteer Pages
import DeliveriesPage from './pages/volunteer/DeliveriesPage';
import QRScanPage from './pages/volunteer/QRScanPage';

// Shared Pages
import NotificationsPage from './pages/notifications/NotificationsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';

// Admin Pages
import VerificationsPage from './pages/admin/VerificationsPage';
import UsersPage from './pages/admin/UsersPage';
import ComplaintsPage from './pages/admin/ComplaintsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#fff',
              fontSize: '14px',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Dashboard Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Core / Dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Donations (Provider & General) */}
            <Route path="/donations" element={<DonationsPage />} />
            <Route
              path="/donations/new"
              element={
                <ProtectedRoute allowedRoles={['provider', 'admin']}>
                  <CreateDonationPage />
                </ProtectedRoute>
              }
            />
            <Route path="/donations/:id" element={<DonationDetailPage />} />

            {/* NGO Routes */}
            <Route
              path="/browse"
              element={
                <ProtectedRoute allowedRoles={['ngo', 'admin']}>
                  <BrowseDonationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/claims"
              element={
                <ProtectedRoute allowedRoles={['ngo', 'admin']}>
                  <ClaimsPage />
                </ProtectedRoute>
              }
            />

            {/* Volunteer Routes */}
            <Route
              path="/deliveries"
              element={
                <ProtectedRoute allowedRoles={['volunteer', 'admin']}>
                  <DeliveriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/qr-scan"
              element={
                <ProtectedRoute allowedRoles={['volunteer', 'admin']}>
                  <QRScanPage />
                </ProtectedRoute>
              }
            />

            {/* Notifications & Analytics */}
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />

            {/* Admin Routes */}
            <Route
              path="/admin/verifications"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <VerificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ComplaintsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
