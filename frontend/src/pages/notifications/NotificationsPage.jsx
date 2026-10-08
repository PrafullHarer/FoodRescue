import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Bell, CheckCheck, Clock, ShieldAlert, Package, CheckCircle2, Trash2 } from 'lucide-react';
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
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
            <Bell className="w-7 h-7 text-primary-500" />
            Notifications
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Stay updated with claims, pickup schedules, and delivery milestones.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="btn btn-secondary text-sm flex items-center gap-2 self-start"
          >
            <CheckCheck className="w-4 h-4 text-primary-600" />
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm divide-y divide-surface-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-surface-400">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-surface-400">
            <Bell className="w-12 h-12 mx-auto mb-3 text-surface-300 stroke-1" />
            <p className="font-medium text-surface-700">No notifications yet</p>
            <p className="text-sm text-surface-400 mt-1">When donations are claimed or dispatched, you'll see alerts here.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex items-start gap-4 transition-colors hover:bg-surface-50/80 ${
                !n.is_read ? 'bg-primary-50/30' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  !n.is_read ? 'bg-primary-100 text-primary-600' : 'bg-surface-100 text-surface-500'
                }`}
              >
                {n.type === 'alert' ? (
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                ) : n.type === 'claim' || n.type === 'delivery' ? (
                  <Package className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-semibold ${!n.is_read ? 'text-surface-900' : 'text-surface-700'}`}>
                    {n.title || 'Notification'}
                  </h4>
                  <span className="text-xs text-surface-400 flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <p className="text-sm text-surface-600 mt-1">{n.message || n.body}</p>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
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
