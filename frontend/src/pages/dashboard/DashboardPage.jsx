import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  Package, TrendingUp, Users, Truck, Clock, CheckCircle2,
  ArrowUpRight, AlertCircle, Plus
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentDonations, setRecentDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [metricsRes, donationsRes] = await Promise.all([
        api.get('/analytics/impact').catch(() => ({ data: { data: null } })),
        api.get('/donations', { params: { limit: 5 } }).catch(() => ({ data: { data: { donations: [] } } })),
      ]);
      setStats(metricsRes.data.data);
      setRecentDonations(donationsRes.data.data?.donations || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const statusColor = {
    posted: 'badge-info',
    matched: 'badge-info',
    claimed: 'badge-warning',
    volunteer_assigned: 'badge-warning',
    collected: 'badge-warning',
    delivered: 'badge-success',
    completed: 'badge-success',
    expired: 'badge-danger',
    cancelled: 'badge-danger',
  };

  const roleQuickActions = {
    provider: [
      { to: '/donations/new', icon: Plus, label: 'Post Donation', color: 'gradient-primary' },
      { to: '/donations', icon: Package, label: 'My Donations', color: 'bg-accent-500' },
      { to: '/analytics', icon: TrendingUp, label: 'View Impact', color: 'bg-blue-500' },
    ],
    ngo: [
      { to: '/browse', icon: Package, label: 'Browse Food', color: 'gradient-primary' },
      { to: '/claims', icon: CheckCircle2, label: 'My Claims', color: 'bg-accent-500' },
      { to: '/analytics', icon: TrendingUp, label: 'View Impact', color: 'bg-blue-500' },
    ],
    volunteer: [
      { to: '/deliveries', icon: Truck, label: 'My Deliveries', color: 'gradient-primary' },
      { to: '/qr-scan', icon: CheckCircle2, label: 'Scan QR', color: 'bg-accent-500' },
      { to: '/analytics', icon: TrendingUp, label: 'View Impact', color: 'bg-blue-500' },
    ],
    admin: [
      { to: '/admin/verifications', icon: Users, label: 'Pending Verifications', color: 'gradient-primary' },
      { to: '/admin/complaints', icon: AlertCircle, label: 'Complaints', color: 'bg-accent-500' },
      { to: '/analytics', icon: TrendingUp, label: 'Analytics', color: 'bg-blue-500' },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">
          {greeting()}, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-surface-500 mt-1">Here's what's happening with your food rescue activities</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Total Donations',
            value: stats?.donations?.total_donations || 0,
            icon: Package,
            color: 'text-primary-600',
            bg: 'bg-primary-50',
          },
          {
            label: 'Completed',
            value: stats?.donations?.completed_donations || 0,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Servings Rescued',
            value: stats?.donations?.total_servings_rescued || 0,
            icon: TrendingUp,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'Active Now',
            value: stats?.donations?.active_donations || 0,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-surface-300" />
            </div>
            <p className="text-2xl font-bold text-surface-900">{Number(stat.value).toLocaleString()}</p>
            <p className="text-sm text-surface-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-surface-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(roleQuickActions[user?.role] || []).map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-4 p-5 bg-white rounded-xl border border-surface-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center flex-shrink-0`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-surface-800">{action.label}</p>
                <p className="text-xs text-surface-400 mt-0.5">Click to continue →</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent donations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-800">Recent Donations</h2>
          <Link to="/donations" className="text-sm text-primary-600 font-medium hover:text-primary-700">
            View all →
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          {recentDonations.length === 0 ? (
            <div className="p-8 text-center text-surface-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No donations yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Title</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Category</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Quantity</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Posted</th>
                </tr>
              </thead>
              <tbody>
                {recentDonations.map((d) => (
                  <tr key={d.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/donations/${d.id}`} className="font-medium text-surface-800 hover:text-primary-600">
                        {d.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-600 capitalize">
                      {d.category?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-600">
                      {d.quantity} {d.unit}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${statusColor[d.status] || 'badge-info'}`}>
                        {d.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-500">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
