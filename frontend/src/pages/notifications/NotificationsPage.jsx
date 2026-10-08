import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  Bell, CheckCheck, Clock, ShieldAlert, Package, CheckCircle2,
  Inbox, Utensils, ExternalLink, RefreshCw, ChevronRight
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
    const interval = setInterval(() => fetchNotifications(false), 8000);
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

    // 2. Parse payload
    let notifData = n.data;
    if (typeof notifData === 'string') {
      try {
        notifData = JSON.parse(notifData);
      } catch {
        notifData = null;
      }
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

    // Fallback based on text or user role
    const titleLower = (n.title || '').toLowerCase();
    const bodyLower = (n.body || n.message || '').toLowerCase();

    if (titleLower.includes('claim') || bodyLower.includes('claim')) {
      if (user?.role === 'ngo') navigate('/claims');
      else if (user?.role === 'provider') navigate('/donations');
      else navigate('/browse');
    } else if (titleLower.includes('delivery') || titleLower.includes('mission') || titleLower.includes('volunteer')) {
      if (user?.role === 'volunteer') navigate('/deliveries');
      else if (user?.role === 'ngo') navigate('/claims');
      else navigate('/donations');
    } else {
      if (user?.role === 'ngo') navigate('/browse');
      else if (user?.role === 'provider') navigate('/donations');
      else navigate('/dashboard');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const displayedNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-white text-black rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-neutral-400 text-sm mt-1">
            Real-time activity on donations, claim milestones, and rescue dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchNotifications(true)}
            className="p-2.5 rounded-xl border border-[#27272e] bg-[#141416] text-neutral-400 hover:text-white hover:border-[#383842] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-white' : ''}`} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn btn-secondary text-xs flex items-center gap-2 py-2.5 px-4"
            >
              <CheckCheck className="w-3.5 h-3.5 text-white" />
              Mark all read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#232328] pb-3">
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
            filter === 'unread'
              ? 'bg-white text-black shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-[#18181c]'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              filter === 'unread' ? 'bg-black text-white' : 'bg-white text-black'
            }`}>
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            filter === 'all'
              ? 'bg-white text-black shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-[#18181c]'
          }`}
        >
          All ({notifications.length})
        </button>
      </div>

      {/* List */}
      <div className="bg-[#121214] rounded-2xl border border-[#232328] overflow-hidden divide-y divide-[#232328]">
        {loading ? (
          <div className="p-16 text-center text-neutral-500">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            Loading notifications...
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="p-16 text-center text-neutral-500">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
            <p className="font-semibold text-white text-base">
              {filter === 'unread' ? 'No unread notifications' : 'All caught up'}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {filter === 'unread'
                ? 'You have read all your notifications.'
                : 'When new donations, claims, or dispatches happen, alerts will appear here.'}
            </p>
          </div>
        ) : (
          displayedNotifications.map((n) => {
            let notifData = n.data;
            if (typeof notifData === 'string') {
              try {
                notifData = JSON.parse(notifData);
              } catch {
                notifData = null;
              }
            }

            const isDonation = notifData?.type === 'new_donation' || notifData?.donation_id;

            return (
              <div
                key={n.id}
                onClick={() => handleCardClick(n)}
                className={`p-5 flex items-start gap-4 transition-all cursor-pointer hover:bg-[#18181b] relative group ${
                  !n.is_read ? 'bg-[#18181c]/60' : ''
                }`}
              >
                {/* Unread indicator dot */}
                {!n.is_read && (
                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-r-full" />
                )}

                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all ${
                    !n.is_read
                      ? 'bg-white text-black border-white shadow-md'
                      : 'bg-[#1c1c20] text-neutral-400 border-[#27272e]'
                  }`}
                >
                  {isDonation ? (
                    <Utensils className="w-5 h-5" />
                  ) : n.type === 'alert' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : n.type === 'claim' || n.type === 'delivery' ? (
                    <Package className="w-5 h-5" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm font-semibold flex items-center gap-2 ${!n.is_read ? 'text-white font-bold' : 'text-neutral-300'}`}>
                      {n.title || 'Notification'}
                      {!n.is_read && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/20">
                          New
                        </span>
                      )}
                    </h4>
                    <span className="text-xs text-neutral-500 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">{n.message || n.body}</p>

                  <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-neutral-400 group-hover:text-white transition-colors">
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white" />
                    <span>
                      {notifData?.donation_id
                        ? 'Click to view donation details'
                        : notifData?.claim_id
                        ? 'Click to view claim details'
                        : notifData?.delivery_id
                        ? 'Click to view delivery details'
                        : 'Click to view'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-neutral-500 group-hover:text-white" />
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={(e) => handleMarkAsRead(e, n.id)}
                    className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-[#232328] transition-colors flex-shrink-0"
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

