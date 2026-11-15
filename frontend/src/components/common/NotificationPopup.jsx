import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
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
 * Headless Browser Notification Dispatcher
 * Requests browser notification permission natively and dispatches updates via the Web Notification API.
 * Renders null so nothing is displayed on the main screen.
 */
export default function NotificationPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [permission, setPermission] = useState(getBrowserNotificationPermission());
  const intervalRef = useRef(null);

  // Request browser permission if default
  useEffect(() => {
    if (!isBrowserNotificationSupported()) return;

    if (Notification.permission === 'default') {
      // Attempt requesting permission immediately
      requestBrowserNotificationPermission().then((res) => {
        setPermission(res);
      });

      // Also attach a one-time user-interaction trigger as fallback for strict browsers
      const handleUserGesture = () => {
        if (Notification.permission === 'default') {
          requestBrowserNotificationPermission().then((res) => {
            setPermission(res);
          });
        }
      };

      window.addEventListener('click', handleUserGesture, { once: true });
      return () => {
        window.removeEventListener('click', handleUserGesture);
      };
    } else {
      setPermission(Notification.permission);
    }
  }, []);

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

  // Headless: renders nothing on the main screen
  return null;
}
