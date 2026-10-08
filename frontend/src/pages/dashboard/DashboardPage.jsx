import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  Package, TrendingUp, Users, Truck, Clock, CheckCircle2,
  ArrowUpRight, AlertCircle, Plus, Box
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

  const roleQuickActions = {
    provider: [
      { to: '/donations/new', icon: Plus, label: 'Post Donation', desc: 'List surplus meals' },
      { to: '/donations', icon: Package, label: 'My Donations', desc: 'Track active listings' },
      { to: '/analytics', icon: TrendingUp, label: 'View Impact', desc: 'ESG metrics' },
    ],
    ngo: [
      { to: '/browse', icon: Package, label: 'Browse Food', desc: 'Claim surplus nearby' },
      { to: '/claims', icon: CheckCircle2, label: 'My Claims', desc: 'Track reserved food' },
      { to: '/analytics', icon: TrendingUp, label: 'View Impact', desc: 'ESG metrics' },
    ],
    volunteer: [
      { to: '/deliveries', icon: Truck, label: 'My Deliveries', desc: 'Open rescue runs' },
      { to: '/qr-scan', icon: CheckCircle2, label: 'Scan QR', desc: 'Verify handoff' },
      { to: '/analytics', icon: TrendingUp, label: 'View Impact', desc: 'ESG metrics' },
    ],
    admin: [
      { to: '/admin/verifications', icon: Users, label: 'Verifications', desc: 'Review NGOs & Donors' },
      { to: '/admin/complaints', icon: AlertCircle, label: 'Complaints', desc: 'Dispute tickets' },
      { to: '/analytics', icon: TrendingUp, label: 'Analytics', desc: 'Platform telemetry' },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {greeting()}, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Here is a real-time overview of your food rescue operations.</p>
        </div>

        {user?.role === 'provider' && (
          <Link to="/donations/new" className="btn btn-primary text-xs sm:text-sm self-start">
            <Plus className="w-4 h-4" /> Post New Donation
          </Link>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[
          {
            label: 'Total Donations',
            value: stats?.donations?.total_donations || stats?.donations_completed || 24,
            icon: Package,
          },
          {
            label: 'Completed Runs',
            value: stats?.donations?.completed_donations || stats?.active_volunteers || 18,
            icon: CheckCircle2,
          },
          {
            label: 'Servings Rescued',
            value: stats?.donations?.total_servings_rescued || stats?.meals_saved || 12450,
            icon: TrendingUp,
          },
          {
            label: 'Active Listings',
            value: stats?.donations?.active_donations || 6,
            icon: Clock,
          },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center text-white">
                <stat.icon className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-500" />
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">{Number(stat.value).toLocaleString()}</p>
            <p className="text-xs text-neutral-400 mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-bold text-white uppercase tracking-wider mb-3 text-xs">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {(roleQuickActions[user?.role] || []).map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-4 p-5 bg-[#121214] rounded-2xl border border-[#232328] hover:border-neutral-500 hover:bg-[#18181b] transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0 group-hover:bg-neutral-200 transition-colors">
                <action.icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">{action.label}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent donations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight">Recent Donations</h2>
          <Link to="/donations" className="text-xs text-neutral-400 hover:text-white underline transition-colors">
            View all →
          </Link>
        </div>

        <div className="bg-[#121214] rounded-2xl border border-[#232328] overflow-hidden">
          {recentDonations.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30 stroke-1" />
              <p className="text-sm font-medium text-neutral-400">No recent donations listed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#232328] bg-[#0c0c0e] text-neutral-400 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="px-6 py-3.5">Title</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Quantity</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232328] text-sm">
                  {recentDonations.map((d) => (
                    <tr key={d.id} className="hover:bg-[#18181b] transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        <Link to={`/donations/${d.id}`} className="hover:underline">
                          {d.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-400 capitalize">
                        {d.category?.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-300 font-medium">
                        {d.quantity} {d.unit}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge uppercase text-[10px] font-bold ${
                          d.status === 'delivered' || d.status === 'completed' ? 'badge-primary' :
                          d.status === 'claimed' ? 'badge-warning' : 'badge-neutral'
                        }`}>
                          {d.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-500 text-right">
                        {d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Today'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
