import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ReputationProvider } from './contexts/ReputationContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Landing Page
import LandingPage from './pages/landing/LandingPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CompleteProfilePage from './pages/auth/CompleteProfilePage';

// Main Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import DonationsPage from './pages/donations/DonationsPage';
import CreateDonationPage from './pages/donations/CreateDonationPage';
import DonationDetailPage from './pages/donations/DonationDetailPage';
import MyReviewsPage from './pages/reviews/MyReviewsPage';

// NGO Pages
import BrowseDonationsPage from './pages/ngo/BrowseDonationsPage';
import ClaimsPage from './pages/ngo/ClaimsPage';

// Volunteer Pages
import DeliveriesPage from './pages/volunteer/DeliveriesPage';
import QRScanPage from './pages/volunteer/QRScanPage';

// Shared Pages
import NotificationsPage from './pages/notifications/NotificationsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import ProfilePage from './pages/profile/ProfilePage';
import MyComplaintsPage from './pages/complaints/MyComplaintsPage';
import ComplaintDetailPage from './pages/complaints/ComplaintDetailPage';

// Admin Pages
import VerificationsPage from './pages/admin/VerificationsPage';
import UsersPage from './pages/admin/UsersPage';
import ComplaintsPage from './pages/admin/ComplaintsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import IncidentsPage from './pages/admin/IncidentsPage';
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage';

// Public Feedback Page
import FeedbackPage from './pages/feedback/FeedbackPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReputationProvider>
          <BrowserRouter>
            <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              },
              success: {
                iconTheme: {
                  primary: 'var(--color-success)',
                  secondary: 'var(--color-surface)',
                },
              },
              error: {
                iconTheme: {
                  primary: 'var(--color-error)',
                  secondary: 'var(--color-surface)',
                },
              },
            }}
          />
          <Routes>
            {/* Public Landing & Auth Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/complete-profile" element={<CompleteProfilePage />} />

            {/* Protected Dashboard Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Core / Dashboard */}
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
                  <ProtectedRoute allowedRoles={['volunteer', 'ngo', 'provider', 'admin']}>
                    <QRScanPage />
                  </ProtectedRoute>
                }
              />

              {/* Notifications & Analytics */}
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/reviews"
                element={
                  <ProtectedRoute allowedRoles={['provider', 'ngo', 'volunteer']}>
                    <MyReviewsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/complaints" element={<MyComplaintsPage />} />
              <Route path="/complaints/:id" element={<ComplaintDetailPage />} />

              {/* Admin Routes */}
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/hotspots"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminAnalyticsPage defaultTab="overview" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/incidents"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <IncidentsPage />
                  </ProtectedRoute>
                }
              />
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
              <Route
                path="/admin/feedback"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminFeedbackPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ReputationProvider>
    </AuthProvider>
  </ThemeProvider>
);
}
