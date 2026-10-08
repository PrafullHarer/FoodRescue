import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  Bell, X, ChevronRight, Utensils,
  Package, Clock, ExternalLink
} from 'lucide-react';

const POLL_INTERVAL = 4000; // 4 seconds for responsive real-time updates

/**
 * Bottom-right notification popup for users (NGOs, Providers, Volunteers).
 * Polls for unread notifications and displays them as slide-in cards with auto-dismiss.
 */
export default function NotificationPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [popups, setPopups] = useState([]);
  const shownIdsRef = useRef(new Set());
  const intervalRef = useRef(null);

  const dismissPopup = useCallback((popupId) => {
    setPopups(prev => prev.filter(p => p._popupId !== popupId));
  }, []);

  const fetchNewNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications', {
        params: { unread: 'true', limit: 10 },
      });

      const notifications = data?.data?.notifications || [];
      if (notifications.length === 0) return;

      // Find any unread notification that hasn't been shown yet in this session
      const freshNotifications = notifications.filter(
        n => !shownIdsRef.current.has(n.id)
      );

      if (freshNotifications.length > 0) {
        // Record them as shown
        freshNotifications.forEach(n => shownIdsRef.current.add(n.id));

        // Add up to 3 to popup queue
        setPopups(prev => {
          const newPopups = freshNotifications.slice(0, 3).map(n => ({
            ...n,
            _popupId: `${n.id}-${Date.now()}`,
          }));
          return [...newPopups, ...prev].slice(0, 4);
        });
      }
    } catch {
      // Silently fail
    }
  }, [user]);

  // Auto-dismiss popups after 8 seconds
  useEffect(() => {
    if (popups.length === 0) return;

    const timers = popups.map(p =>
      setTimeout(() => {
        dismissPopup(p._popupId);
      }, 8000)
    );

    return () => timers.forEach(clearTimeout);
  }, [popups, dismissPopup]);

  // Start polling
  useEffect(() => {
    if (!user) return;

    // Fetch immediately on mount
    fetchNewNotifications();

    intervalRef.current = setInterval(fetchNewNotifications, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, fetchNewNotifications]);

  const handleClick = async (popup) => {
    // Mark as read
    try {
      await api.patch(`/notifications/${popup.id}/read`);
    } catch {
      // ignore
    }

    // Parse the notification data
    let notifData = popup.data;
    if (typeof notifData === 'string') {
      try {
        notifData = JSON.parse(notifData);
      } catch {
        notifData = null;
      }
    }

    dismissPopup(popup._popupId);

    const donationId = notifData?.donation_id || notifData?.donationId || popup.donation_id;
    const isValidUUID = donationId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(donationId);

    if (isValidUUID) {
      navigate(`/donations/${donationId}`);
    } else if (notifData?.claim_id) {
      navigate('/claims');
    } else if (notifData?.delivery_id) {
      navigate('/deliveries');
    } else if (user?.role === 'ngo') {
      navigate('/browse');
    } else if (user?.role === 'provider') {
      navigate('/donations');
    } else {
      navigate('/notifications');
    }
  };

  if (popups.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 max-w-sm w-full pointer-events-none">
      {popups.map((popup, index) => (
        <div
          key={popup._popupId}
          className="pointer-events-auto animate-slide-in-right"
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <div className="bg-[#141416] border border-[#2a2a30] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-xl">
            {/* Accent bar */}
            <div className="h-[3px] bg-gradient-to-r from-white via-neutral-400 to-transparent" />

            <div className="p-4">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0 shadow-md">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-white leading-tight truncate">
                      {popup.title}
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Just now
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissPopup(popup._popupId);
                  }}
                  className="p-1 rounded-lg text-neutral-500 hover:text-white hover:bg-[#1f1f24] transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body */}
              <p className="text-[12px] text-neutral-300 leading-relaxed line-clamp-2 mb-3">
                {popup.body}
              </p>

              {/* Action */}
              <button
                onClick={() => handleClick(popup)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/5 border border-[#2a2a30] hover:bg-white/10 hover:border-neutral-500 transition-all text-xs group"
              >
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                  View Details
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
