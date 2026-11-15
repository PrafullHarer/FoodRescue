import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from '../../utils/browserNotifications';

const POLL_INTERVAL = 30000; // 30 seconds

const getSeenIds = (userId) => {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`foodrescue_seen_browser_notifs_${userId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveSeenIds = (userId, seenSet) => {
  if (!userId) return;
  try {
    const arr = Array.from(seenSet).slice(-100);
    localStorage.setItem(`foodrescue_seen_browser_notifs_${userId}`, JSON.stringify(arr));
  } catch {
    // ignore
  }
};

const isDonationNotification = (n) => {
  let data = n.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  if (
    data?.incident_id ||
    data?.complaint_id ||
    data?.verification_id ||
    data?.type?.startsWith?.('complaint') ||
    data?.type?.startsWith?.('incident')
  ) {
    return false;
  }
  const titleLower = (n.title || '').toLowerCase();
  if (titleLower.includes('incident') || titleLower.includes('complaint') || titleLower.includes('escalation')) {
    return false;
  }
  if (data?.donation_id || data?.donationId || data?.delivery_id || data?.claim_id) return true;
  if (['new_donation', 'delivery_available', 'donation_claimed', 'donation_status', 'donation_matched'].includes(data?.type)) return true;
  const bodyLower = (n.body || n.message || '').toLowerCase();
  return titleLower.includes('donation') || titleLower.includes('pickup mission') || bodyLower.includes('donation');
};

const resolveNotificationRoute = (notification, user) => {
  let notifData = notification.data;
  if (typeof notifData === 'string') {
    try {
      notifData = JSON.parse(notifData);
    } catch {
      notifData = null;
    }
  }

  const titleLower = (notification.title || '').toLowerCase();
  const isIncident = notifData?.incident_id || notification.type === 'incident' || titleLower.includes('incident') || titleLower.includes('escalation');
  const isVerification = notifData?.verification_id || notification.type === 'verification' || titleLower.includes('verification');
  const isComplaint = notifData?.complaint_id || notification.type === 'complaint' || titleLower.includes('complaint');

  if (isIncident && user?.role === 'admin') {
    return '/admin/incidents';
  }

  if (isVerification && user?.role === 'admin') {
    return '/admin/verifications';
  }

  if (isComplaint) {
    return user?.role === 'admin' ? '/admin/complaints' : '/complaints';
  }

  const donationId = notifData?.donation_id || notifData?.donationId || notification.donation_id;
  const isValidUUID = donationId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(donationId);

  if (isValidUUID) {
    return `/donations/${donationId}`;
  } else if (notifData?.claim_id) {
    return '/claims';
  } else if (notifData?.delivery_id) {
    return '/deliveries';
  } else if (user?.role === 'ngo') {
    return '/browse';
  } else if (user?.role === 'provider') {
    return '/donations';
  } else {
    return '/notifications';
  }
};

/**
 * Native Browser Notification Dispatcher
 * Requests browser notification permission and sends notifications via the browser's native API.
 * Keeps the main screen clean with zero intrusive popup cards.
 */
export default function NotificationPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [permission, setPermission] = useState(getBrowserNotificationPermission());
  const [promptDismissed, setPromptDismissed] = useState(() => {
    return localStorage.getItem('foodrescue_browser_notif_prompt_dismissed') === 'true';
  });
  const intervalRef = useRef(null);

  // Sync permission status
  useEffect(() => {
    if (isBrowserNotificationSupported()) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    const result = await requestBrowserNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      sendBrowserNotification('FoodRescue Notifications Active', {
        body: 'You will now receive real-time donation and delivery alerts directly from your browser.',
      });
    }
  };

  const handleDismissPrompt = () => {
    setPromptDismissed(true);
    localStorage.setItem('foodrescue_browser_notif_prompt_dismissed', 'true');
  };

  const fetchAndDispatchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications', {
        params: { unread: 'true', limit: 8 },
      });

      let notifications = data?.data?.notifications || [];
      // Admins should not receive donation-related notification alerts
      if (user?.role === 'admin') {
        notifications = notifications.filter(n => !isDonationNotification(n));
      }

      if (notifications.length === 0) return;

      const seenSet = getSeenIds(user.id);
      const freshNotifications = notifications.filter(n => !seenSet.has(n.id));

      if (freshNotifications.length > 0) {
        freshNotifications.forEach(n => {
          seenSet.add(n.id);

          // Dispatch native browser notification
          if (permission === 'granted' || (isBrowserNotificationSupported() && Notification.permission === 'granted')) {
            const targetRoute = resolveNotificationRoute(n, user);
            sendBrowserNotification(
              n.title || 'FoodRescue Notification',
              {
                body: n.body || n.message || 'New update available on FoodRescue.',
                tag: `foodrescue-${n.id}`,
                renotify: true,
              },
              () => {
                api.patch(`/notifications/${n.id}/read`).catch(() => {});
                navigate(targetRoute);
              }
            );
          }
        });

        saveSeenIds(user.id, seenSet);
      }
    } catch {
      // Silently fail
    }
  }, [user, permission, navigate]);

  // Polling loop
  useEffect(() => {
    if (!user) return;

    fetchAndDispatchNotifications();
    intervalRef.current = setInterval(fetchAndDispatchNotifications, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, fetchAndDispatchNotifications]);

  // If permission is already granted, denied, unsupported, or user dismissed prompt,
  // do NOT render anything on the main screen. The website stays completely clean!
  if (
    !isBrowserNotificationSupported() ||
    permission === 'granted' ||
    permission === 'denied' ||
    promptDismissed
  ) {
    return null;
  }

  // If permission is 'default' and user has not dismissed prompt,
  // render a subtle, non-intrusive banner asking for browser notification permission.
  return (
    <aside
      aria-label="Browser notifications permission"
      className="fixed top-4 right-4 sm:top-5 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] bg-[#121214] text-white border border-lime-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-fade-in"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-lime-500/15 border border-lime-500/30 flex items-center justify-center shrink-0 text-lime-400">
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>Enable Browser Notifications</span>
            <span className="text-[10px] font-semibold text-lime-400 bg-lime-500/10 px-1.5 py-0.2 rounded border border-lime-500/20">
              Native
            </span>
          </h4>
          <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">
            Allow your browser to send instant alerts for food donations, claims, and delivery handoffs without covering your screen.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-400 text-black text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Allow Notifications</span>
            </button>
            <button
              type="button"
              onClick={handleDismissPrompt}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-medium transition-all cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismissPrompt}
          className="text-neutral-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          aria-label="Dismiss prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
