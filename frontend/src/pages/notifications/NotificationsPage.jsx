import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  Bell, CheckCheck, Clock, ShieldAlert, Package, CheckCircle2,
  Inbox, Utensils, ExternalLink, RefreshCw, ChevronRight, Shield,
  AlertTriangle as AlertTriangleIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recent';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unread'); // Default to 'unread' tab
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else if (notifications.length === 0) setLoading(true);

      const res = await api.get('/notifications', {
        params: { limit: 50 },
      });
      setNotifications(res.data.data?.notifications || res.data.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notifications.length]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchNotifications(false);
      }
    }, 25000); // 25 seconds
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      toast.success('Marked as read');
    } catch {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const parseData = (data) => {
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return data;
  };

  const isIncidentNotif = (n) => {
    const d = parseData(n.data);
    const title = (n.title || '').toLowerCase();
    const body = (n.body || n.message || '').toLowerCase();
    return Boolean(
      d?.incident_id ||
      d?.incidentId ||
      d?.type?.startsWith?.('incident') ||
      n.type === 'incident' ||
      title.includes('incident') ||
      title.includes('escalation') ||
      body.includes('incident')
    );
  };

  const isComplaintNotif = (n) => {
    const d = parseData(n.data);
    const title = (n.title || '').toLowerCase();
    const body = (n.body || n.message || '').toLowerCase();
    return Boolean(
      d?.complaint_id ||
      d?.complaintId ||
      d?.type?.startsWith?.('complaint') ||
      n.type === 'complaint' ||
      title.includes('complaint') ||
      body.includes('complaint')
    );
  };

  const isVerificationNotif = (n) => {
    const d = parseData(n.data);
    const title = (n.title || '').toLowerCase();
    const body = (n.body || n.message || '').toLowerCase();
    return Boolean(
      d?.verification_id ||
      d?.verificationId ||
      d?.type?.startsWith?.('verification') ||
      n.type === 'verification' ||
      title.includes('verification') ||
      body.includes('verification')
    );
  };

  const isDonationNotification = (n) => {
    const data = parseData(n.data);
    if (
      data?.incident_id ||
      data?.complaint_id ||
      data?.verification_id ||
      data?.type?.startsWith?.('complaint') ||
      data?.type?.startsWith?.('incident') ||
      data?.type?.startsWith?.('verification')
    ) {
      return false;
    }
    const titleLower = (n.title || '').toLowerCase();
    if (
      titleLower.includes('incident') ||
      titleLower.includes('complaint') ||
      titleLower.includes('escalation') ||
      titleLower.includes('verification')
    ) {
      return false;
    }
    if (data?.donation_id || data?.donationId || data?.delivery_id || data?.claim_id) return true;
    if (['new_donation', 'delivery_available', 'donation_claimed', 'donation_status', 'donation_matched'].includes(data?.type)) return true;
    const bodyLower = (n.body || n.message || '').toLowerCase();
    return titleLower.includes('donation') || titleLower.includes('pickup mission') || bodyLower.includes('donation');
  };

  const handleCardClick = async (n) => {
    // 1. Mark as read immediately
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.id}/read`);
        setNotifications(prev =>
          prev.map(item => item.id === n.id ? { ...item, is_read: true } : item)
        );
      } catch {
        // ignore
      }
    }

    const notifData = parseData(n.data);
    const titleLower = (n.title || '').toLowerCase();
    const bodyLower = (n.body || n.message || '').toLowerCase();

    // Prioritize administrative operational alerts
    if (isIncidentNotif(n)) {
      if (user?.role === 'admin') navigate('/admin/incidents');
      return;
    }

    if (isVerificationNotif(n)) {
      if (user?.role === 'admin') navigate('/admin/verifications');
      return;
    }

    if (isComplaintNotif(n)) {
      const complaintId = notifData?.complaint_id || notifData?.complaintId;
      if (user?.role === 'admin') navigate('/admin/complaints');
      else if (complaintId) navigate(`/complaints/${complaintId}`);
      else navigate('/complaints');
      return;
    }

    const donationId = notifData?.donation_id || notifData?.donationId || n.donation_id;
    const isValidUUID = donationId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(donationId);

    if (isValidUUID) {
      navigate(`/donations/${donationId}`);
      return;
    }

    if (notifData?.claim_id) {
      navigate('/claims');
      return;
    }

    if (notifData?.delivery_id) {
      navigate('/deliveries');
      return;
    }

    // Role-based fallbacks
    if (titleLower.includes('claim') || bodyLower.includes('claim')) {
      if (user?.role === 'ngo') navigate('/claims');
      else if (user?.role === 'provider') navigate('/donations');
      else navigate('/browse');
    } else if (titleLower.includes('delivery') || titleLower.includes('mission') || titleLower.includes('volunteer')) {
      if (user?.role === 'volunteer') navigate('/deliveries');
      else if (user?.role === 'ngo') navigate('/claims');
      else navigate('/donations');
    } else {
      if (user?.role === 'admin') navigate('/dashboard');
      else if (user?.role === 'ngo') navigate('/browse');
      else if (user?.role === 'provider') navigate('/donations');
      else navigate('/dashboard');
    }
  };

  const filteredNotifications = user?.role === 'admin'
    ? notifications.filter(n => !isDonationNotification(n))
    : notifications;

  const unreadCount = filteredNotifications.filter(n => !n.is_read).length;
  const incidentCount = filteredNotifications.filter(n => isIncidentNotif(n)).length;
  const complaintCount = filteredNotifications.filter(n => isComplaintNotif(n)).length;
  const verificationCount = filteredNotifications.filter(n => isVerificationNotif(n)).length;

  const displayedNotifications = filteredNotifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'incidents') return isIncidentNotif(n);
    if (filter === 'complaints') return isComplaintNotif(n);
    if (filter === 'verifications') return isVerificationNotif(n);
    return true; // 'all'
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-[#232328] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-[#39FF14] text-black rounded-full shadow-xs">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            {user?.role === 'admin'
              ? 'Real-time administrative operational activity on incidents, escalations, grievances, and system verifications.'
              : 'Real-time activity on donations, claim milestones, complaints, and rescue dispatches.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchNotifications(true)}
            className="p-2.5 rounded-xl border border-neutral-200 dark:border-[#27272e] bg-white dark:bg-[#141416] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-[#383842] transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn btn-secondary text-xs flex items-center gap-2 py-2.5 px-4"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-[#232328] pb-3 overflow-x-auto">
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            filter === 'unread'
              ? 'bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] shadow-sm font-bold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#18181c] border border-transparent'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              filter === 'unread'
                ? 'bg-[#39FF14] text-black'
                : 'bg-neutral-200 text-neutral-800 dark:bg-[#232328] dark:text-neutral-300'
            }`}>
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'all'
              ? 'bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] shadow-sm font-bold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#18181c] border border-transparent'
          }`}
        >
          All ({filteredNotifications.length})
        </button>

        {user?.role === 'admin' && (
          <>
            <button
              onClick={() => setFilter('incidents')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filter === 'incidents'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#18181c]'
              }`}
            >
              Incidents ({incidentCount})
            </button>
            <button
              onClick={() => setFilter('complaints')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filter === 'complaints'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#18181c]'
              }`}
            >
              Complaints ({complaintCount})
            </button>
            <button
              onClick={() => setFilter('verifications')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filter === 'verifications'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#18181c]'
              }`}
            >
              Verifications ({verificationCount})
            </button>
          </>
        )}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-neutral-200 dark:border-[#232328] overflow-hidden divide-y divide-neutral-200/80 dark:divide-[#232328] shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-neutral-500 dark:text-neutral-400">
            <div className="w-8 h-8 border-2 border-neutral-300 dark:border-white/20 border-t-neutral-900 dark:border-t-white rounded-full animate-spin mx-auto mb-3" />
            Loading notifications...
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 dark:text-neutral-400">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-neutral-400 dark:text-neutral-600 stroke-1" />
            <p className="font-semibold text-neutral-900 dark:text-white text-base">
              {filter === 'unread'
                ? 'No unread notifications'
                : filter === 'incidents'
                ? 'No incident alerts'
                : filter === 'complaints'
                ? 'No complaint notifications'
                : filter === 'verifications'
                ? 'No pending verification alerts'
                : 'All caught up'}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {filter === 'unread'
                ? 'You have read all current notifications.'
                : user?.role === 'admin'
                ? 'Administrative alerts, critical incidents, and escalations will appear here in real time.'
                : 'When new donations, claims, or dispatches happen, alerts will appear here.'}
            </p>
          </div>
        ) : (
          displayedNotifications.map((n) => {
            const notifData = parseData(n.data);
            const isIncident = isIncidentNotif(n);
            const isVerification = isVerificationNotif(n);
            const isComplaint = isComplaintNotif(n);
            const isDonation = notifData?.type === 'new_donation' || notifData?.donation_id;
            const isExpiring =
              n.type === 'expiry_warning' ||
              n.type === 'expiry' ||
              n.title?.toLowerCase().includes('expir') ||
              (n.message || n.body)?.toLowerCase().includes('expir');

            const isRejected =
              n.title?.toLowerCase().includes('reject') ||
              (n.message || n.body)?.toLowerCase().includes('reject');

            const isResolved =
              n.title?.toLowerCase().includes('resolved') ||
              (n.message || n.body)?.toLowerCase().includes('resolved');

            return (
              <div
                key={n.id}
                onClick={() => handleCardClick(n)}
                className={`p-5 flex items-start gap-4 transition-all cursor-pointer relative group ${
                  isIncident
                    ? 'bg-red-50/40 hover:bg-red-50/70 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                    : isExpiring
                    ? 'bg-amber-50/80 border-l-4 border-l-amber-500 text-amber-950 dark:bg-amber-950/25 dark:border-l-amber-500 dark:text-amber-100 hover:bg-amber-100/70 dark:hover:bg-amber-950/40'
                    : isRejected
                    ? 'bg-red-50/50 hover:bg-red-50/80 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                    : !n.is_read
                    ? 'bg-neutral-50/90 hover:bg-neutral-100/80 dark:bg-[#18181c]/70 dark:hover:bg-[#18181b]'
                    : 'bg-white hover:bg-neutral-50/70 dark:bg-transparent dark:hover:bg-[#18181b]/40'
                }`}
              >
                {/* Unread indicator left bar in electric green */}
                {!n.is_read && !isExpiring && !isIncident && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#39FF14] rounded-r-full shadow-xs" />
                )}
                {!n.is_read && isIncident && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-red-500 rounded-r-full shadow-xs" />
                )}

                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all ${
                    isIncident
                      ? 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 shadow-xs'
                      : isVerification
                      ? 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 shadow-xs'
                      : isExpiring
                      ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700 shadow-xs'
                      : isRejected
                      ? 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 shadow-xs'
                      : isResolved
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 shadow-xs'
                      : !n.is_read
                      ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-[#1c1c22] dark:text-[#39FF14] dark:border-emerald-500/30 shadow-xs'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-[#18181c] dark:text-neutral-400 dark:border-[#27272e]'
                  }`}
                >
                  {isIncident ? (
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : isVerification ? (
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : isExpiring ? (
                    <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : isRejected ? (
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : isResolved ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : isDonation ? (
                    <Utensils className="w-5 h-5" />
                  ) : isComplaint || n.type === 'alert' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : n.type === 'claim' || n.type === 'delivery' ? (
                    <Package className="w-5 h-5" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm flex items-center gap-2 ${
                      isIncident
                        ? 'text-red-900 dark:text-red-300 font-bold'
                        : isExpiring
                        ? 'text-amber-950 dark:text-amber-100 font-bold'
                        : isRejected
                        ? 'text-red-900 dark:text-red-300 font-bold'
                        : !n.is_read
                        ? 'text-neutral-900 dark:text-white font-bold'
                        : 'text-neutral-700 dark:text-neutral-300 font-medium'
                    }`}>
                      {n.title || 'Notification'}
                      {isIncident && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 border border-red-300 dark:border-red-700">
                          Incident Alert
                        </span>
                      )}
                      {isExpiring && !isIncident && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-200 border border-amber-400/50">
                          Urgent Expiry
                        </span>
                      )}
                      {!n.is_read && !isExpiring && !isIncident && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#39FF14]/20 text-neutral-900 dark:text-[#39FF14] border border-[#39FF14]/50">
                          New
                        </span>
                      )}
                    </h4>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 leading-relaxed font-normal">
                    {n.message || n.body}
                  </p>

                  <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white" />
                    <span>
                      {isIncident && user?.role === 'admin'
                        ? 'Open Incident Console'
                        : isVerification && user?.role === 'admin'
                        ? 'Review Verification Records'
                        : isComplaint && user?.role === 'admin'
                        ? 'Manage Complaint Ticket'
                        : isComplaint
                        ? 'View Complaint Details'
                        : notifData?.donation_id
                        ? 'View Donation Details'
                        : notifData?.claim_id
                        ? 'View Claim Details'
                        : notifData?.delivery_id
                        ? 'View Delivery Details'
                        : 'View Details'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white" />
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={(e) => handleMarkAsRead(e, n.id)}
                    className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-[#232328] transition-colors flex-shrink-0 cursor-pointer"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
