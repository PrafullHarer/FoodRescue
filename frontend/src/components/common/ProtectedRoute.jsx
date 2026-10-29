import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white transition-colors">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin"></div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">Loading FoodRescue...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Mandatory profile completion check
  if (user.profile_completed === false) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
