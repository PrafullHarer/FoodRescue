import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  Package, TrendingUp, Users, Truck, Clock, CheckCircle2,
  ArrowUpRight, AlertCircle, Plus, ChevronRight, Bell, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentDonations, setRecentDonations] = useState([]);
  const [availableMissions, setAvailableMissions] = useState([]);
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [user?.role, user?.id]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const promises = [
        api.get('/analytics/impact').catch(() => ({ data: { data: null } })),
      ];

      if (user?.role === 'provider') {
        promises.push(
          api.get('/donations/my', { params: { limit: 5 } }).catch(() => ({ data: { data: { donations: [] } } }))
        );
      } else if (user?.role === 'ngo') {
        promises.push(
          api.get('/donations/my-claims', { params: { limit: 5 } }).catch(() => ({ data: { data: { donations: [] } } }))
        );
      } else if (user?.role === 'volunteer') {
        promises.push(
          api.get('/volunteers/my-deliveries').catch(() => ({ data: { data: [] } }))
        );
        promises.push(
          api.get('/volunteers/available-missions').catch(() => ({ data: { data: [] } }))
        );
      } else {
        // Admin
        promises.push(
          api.get('/donations', { params: { limit: 5 } }).catch(() => ({ data: { data: { donations: [] } } }))
        );
        promises.push(
          api.get('/admin/verifications', { params: { status: 'PENDING', limit: 1 } }).catch(() => ({ data: { data: { stats: { pending: 0 } } } }))
        );
      }

      const results = await Promise.all(promises);
      setStats(results[0]?.data?.data || null);

      if (user?.role === 'volunteer') {
        setRecentDonations(results[1]?.data?.data || []);
        if (results[2]) {
          setAvailableMissions(results[2]?.data?.data || []);
        }
      } else if (user?.role === 'admin') {
        setRecentDonations(results[1]?.data?.data?.donations || []);
        setPendingVerificationsCount(results[2]?.data?.data?.stats?.pending || 0);
      } else {
        setRecentDonations(results[1]?.data?.data?.donations || []);
      }
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
      { to: '/notifications', icon: Bell, label: 'Notifications', desc: 'Operational alerts & escalations' },
      { to: '/admin/incidents', icon: ShieldAlert, label: 'Incidents', desc: 'System critical issues' },
      { to: '/admin/verifications', icon: Users, label: 'Verifications', desc: 'Review NGOs & Donors' },
      { to: '/admin/complaints', icon: AlertCircle, label: 'Complaints', desc: 'Dispute tickets' },
      { to: '/admin/feedback', icon: CheckCircle2, label: 'Feedback', desc: 'Review suggestions' },
      { to: '/admin/analytics', icon: TrendingUp, label: 'Analytics', desc: 'Platform telemetry & hotspots' },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-neutral-400 border-t-neutral-900 dark:border-white/20 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      label: user?.role === 'volunteer' ? 'Total Deliveries' : user?.role === 'ngo' ? 'Total Claims' : 'Total Donations',
      value: stats?.donations_total ?? stats?.donations?.total_donations ?? 0,
      icon: Package,
      gradient: 'from-emerald-500 to-teal-400',
      badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      hover: 'hover:border-emerald-500/40',
    },
    {
      label: user?.role === 'ngo' ? 'Received at Shelter' : 'Completed Runs',
      value: stats?.donations_completed ?? stats?.donations?.completed_donations ?? 0,
      icon: CheckCircle2,
      gradient: 'from-sky-500 to-blue-500',
      badge: 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400',
      hover: 'hover:border-sky-500/40',
    },
    {
      label: user?.role === 'ngo' ? 'Servings Received' : 'Servings Rescued',
      value: stats?.meals_saved ?? stats?.donations?.total_servings ?? 0,
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-400',
      badge: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
      hover: 'hover:border-amber-500/40',
    },
    {
      label: user?.role === 'volunteer' ? 'Active Runs' : user?.role === 'ngo' ? 'Pending Claims' : 'Active Listings',
      value: stats?.donations?.active_donations ?? stats?.donations?.active_claims ?? stats?.donations?.active_deliveries ?? 0,
      icon: Clock,
      gradient: 'from-purple-500 to-indigo-500',
      badge: 'bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400',
      hover: 'hover:border-purple-500/40',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-[#232328] pb-5 sm:pb-6 transition-colors">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
            {greeting()}, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mt-1">
            Here is a real-time overview of your food rescue operations.
          </p>
        </div>

        {user?.role === 'provider' && (
          <Link to="/donations/new" className="btn btn-primary text-xs sm:text-sm self-start w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" /> Post New Donation
          </Link>
        )}
      </div>

      {/* Pending Verifications Alert for Admin */}
      {user?.role === 'admin' && pendingVerificationsCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white">
                {pendingVerificationsCount} Registration{pendingVerificationsCount > 1 ? 's' : ''} Awaiting Admin Verification
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                New food providers, NGOs, or volunteers are waiting for verification before receiving platform dashboard access.
              </p>
            </div>
          </div>
          <Link
            to="/admin/verifications"
            className="btn btn-primary bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs py-2 px-4 whitespace-nowrap self-start sm:self-center flex items-center gap-1.5 cursor-pointer"
          >
            Review Verifications Queue
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Stats cards (2 columns on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`stat-card relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] ${stat.hover} shadow-xs hover:shadow-md transition-all duration-300 group`}
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-90`} />
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${stat.badge} border flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">{Number(stat.value).toLocaleString()}</p>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium truncate">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
          {(roleQuickActions[user?.role] || []).map((action, idx) => {
            const actionColor = [
              'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
              'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25',
              'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
              'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25',
            ][idx % 4];

            return (
              <Link
                key={action.to}
                to={action.to}
                className="flex items-center gap-3.5 sm:gap-4 p-4 sm:p-5 bg-white dark:bg-[#121214] rounded-2xl border border-neutral-200 dark:border-[#232328] hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-[#18181b] transition-all group shadow-sm"
              >
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${actionColor} border flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs`}>
                  <action.icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">{action.label}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{action.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Volunteer Available Missions Widget */}
      {user?.role === 'volunteer' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Truck className="w-5 h-5 text-neutral-900 dark:text-white" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">Available Food Pickup Missions</h2>
              <span className="text-[10px] sm:text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Live Open Routes
              </span>
            </div>
            <Link to="/deliveries" className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline transition-colors self-start">
              View all deliveries →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {availableMissions.length === 0 ? (
              <div className="col-span-full p-6 sm:p-8 text-center bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl space-y-1">
                <Truck className="w-8 h-8 mx-auto text-neutral-400 stroke-1" />
                <p className="text-xs font-semibold text-neutral-900 dark:text-white">No pending pickup routes available right now</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">When an NGO claims a food donation, it will appear here for pickup.</p>
              </div>
            ) : (
              availableMissions.slice(0, 4).map((m) => (
                <div key={m.id} className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] hover:border-neutral-400 dark:hover:border-[#383842] rounded-2xl p-4 sm:p-5 space-y-3 transition-colors shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <span className="badge badge-neutral uppercase text-[10px] font-bold mb-1">
                        {m.category?.replace(/_/g, ' ')}
                      </span>
                      <h3 className="font-bold text-neutral-900 dark:text-white text-base">{m.donation_title}</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{m.quantity} {m.unit || 'servings'}</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await api.post(`/volunteers/claim-mission/${m.id}`);
                          toast.success('Pickup mission claimed!');
                          window.location.href = '/deliveries';
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Failed to claim mission');
                        }
                      }}
                      className="btn btn-primary text-xs flex items-center gap-1.5 w-full sm:w-auto justify-center flex-shrink-0 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" /> Claim Pickup
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-neutral-50 dark:bg-[#0c0c0e] p-3 rounded-xl border border-neutral-200 dark:border-[#232328]">
                    <div>
                      <span className="text-neutral-500 uppercase text-[9px] font-bold block">1. Donor Pickup</span>
                      <p className="text-neutral-900 dark:text-white font-medium truncate">{m.provider_name}</p>
                      <p className="text-neutral-500 dark:text-neutral-400 text-[10px] truncate">{m.pickup_address}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500 uppercase text-[9px] font-bold block">2. Shelter Dropoff</span>
                      <p className="text-neutral-900 dark:text-white font-medium truncate">{m.ngo_name}</p>
                      <p className="text-neutral-500 dark:text-neutral-400 text-[10px] truncate">{m.ngo_address}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Recent Activity / Listings / Claims / Deliveries */}
      {(() => {
        const config = {
          provider: {
            title: 'My Recent Listings',
            link: '/donations',
            emptyText: 'No food donations posted yet',
            getItemLink: (d) => `/donations/${d.id}`,
          },
          ngo: {
            title: 'My Recent Claims',
            link: '/claims',
            emptyText: 'You have not claimed any food donations yet',
            getItemLink: () => '/claims',
          },
          volunteer: {
            title: 'My Assigned Deliveries',
            link: '/deliveries',
            emptyText: 'No assigned deliveries in your queue',
            getItemLink: () => '/deliveries',
          },
          admin: {
            title: 'Recent Platform Listings',
            link: '/donations',
            emptyText: 'No platform donations listed yet',
            getItemLink: (d) => `/donations/${d.id}`,
          },
        }[user?.role] || {
          title: 'Recent Activity',
          link: '/donations',
          emptyText: 'No recent activity',
          getItemLink: (d) => `/donations/${d.id}`,
        };

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{config.title}</h2>
              <Link to={config.link} className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline transition-colors">
                View all →
              </Link>
            </div>

            <div className="bg-white dark:bg-[#121214] rounded-2xl border border-neutral-200 dark:border-[#232328] overflow-hidden shadow-sm">
              {recentDonations.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-neutral-500">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30 stroke-1" />
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{config.emptyText}</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card List (< md) */}
                  <div className="divide-y divide-neutral-200 dark:divide-[#232328] md:hidden">
                    {recentDonations.map((d) => (
                      <Link
                        key={d.id}
                        to={config.getItemLink(d)}
                        className="p-4 flex items-center justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-[#18181b] transition-colors block"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`badge uppercase text-[9px] font-bold ${
                              (d.status === 'delivered' || d.status === 'completed') ? 'badge-primary' :
                              d.status === 'claimed' ? 'badge-warning' : 'badge-neutral'
                            }`}>
                              {(d.status || d.delivery_status || 'active')?.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              {d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Today'}
                            </span>
                          </div>
                          <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                            {d.title || d.donation_title || 'Food Donation'}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {d.quantity} {d.unit || 'servings'} • <span className="capitalize">{(d.category || 'perishable')?.replace(/_/g, ' ')}</span>
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>

                  {/* Desktop Table (>= md) */}
                  <div className="hidden md:block table-responsive">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-[#232328] bg-neutral-50 dark:bg-[#0c0c0e] text-neutral-500 dark:text-neutral-400 uppercase text-[10px] font-semibold tracking-wider">
                          <th className="px-6 py-3.5">Title</th>
                          <th className="px-6 py-3.5">Category</th>
                          <th className="px-6 py-3.5">Quantity</th>
                          <th className="px-6 py-3.5">Status</th>
                          <th className="px-6 py-3.5 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-[#232328] text-sm">
                        {recentDonations.map((d) => (
                          <tr key={d.id} className="hover:bg-neutral-50 dark:hover:bg-[#18181b] transition-colors">
                            <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">
                              <Link to={config.getItemLink(d)} className="hover:underline">
                                {d.title || d.donation_title || 'Food Donation'}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                              {(d.category || 'perishable')?.replace(/_/g, ' ')}
                            </td>
                            <td className="px-6 py-4 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                              {d.quantity} {d.unit || 'servings'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`badge uppercase text-[10px] font-bold ${
                                (d.status === 'delivered' || d.status === 'completed') ? 'badge-primary' :
                                d.status === 'claimed' ? 'badge-warning' : 'badge-neutral'
                              }`}>
                                {(d.status || d.delivery_status || 'active')?.replace(/_/g, ' ')}
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
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
