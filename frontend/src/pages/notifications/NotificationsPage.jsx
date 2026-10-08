import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Bell, CheckCheck, Clock, ShieldAlert, Package, CheckCircle2, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data.data?.notifications || res.data.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      toast.success('Marked as read');
    } catch (err) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Notifications</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Real-time activity on donations, claim milestones, and rescue dispatches.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="btn btn-secondary text-xs flex items-center gap-2 self-start py-2.5 px-4"
          >
            <CheckCheck className="w-3.5 h-3.5 text-white" />
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-[#121214] rounded-2xl border border-[#232328] overflow-hidden divide-y divide-[#232328]">
        {loading ? (
          <div className="p-16 text-center text-neutral-500">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center text-neutral-500">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
            <p className="font-semibold text-white text-base">All caught up</p>
            <p className="text-xs text-neutral-400 mt-1">When donations are claimed or dispatched, alerts will appear here.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex items-start gap-4 transition-colors hover:bg-[#18181b] ${
                !n.is_read ? 'bg-[#18181c]/60' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                  !n.is_read
                    ? 'bg-white text-black border-white'
                    : 'bg-[#1c1c20] text-neutral-400 border-[#27272e]'
                }`}
              >
                {n.type === 'alert' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : n.type === 'claim' || n.type === 'delivery' ? (
                  <Package className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-semibold ${!n.is_read ? 'text-white' : 'text-neutral-300'}`}>
                    {n.title || 'Notification'}
                  </h4>
                  <span className="text-xs text-neutral-500 flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{n.message || n.body}</p>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#232328] transition-colors"
                  title="Mark as read"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
