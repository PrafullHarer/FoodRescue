/**
 * Browser Web Notification API Utility
 * FoodRescue — Native Browser Notification Engine
 * 
 * Provides permission requesting, status inspection, and dispatching
 * of native OS/browser desktop and mobile notifications.
 */

export const isBrowserNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getBrowserNotificationPermission = () => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const requestBrowserNotificationPermission = async () => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[BrowserNotification] Error requesting permission:', err);
    return Notification.permission;
  }
};

export const sendBrowserNotification = (title, options = {}, onClick = null) => {
  if (!isBrowserNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const defaultIcon = '/cropped_circle_image.png';
    const notif = new Notification(title, {
      icon: defaultIcon,
      badge: defaultIcon,
      silent: false,
      ...options,
    });

    if (onClick) {
      notif.onclick = (e) => {
        try {
          window.focus();
        } catch {
          // ignore
        }
        onClick(e);
        try {
          notif.close();
        } catch {
          // ignore
        }
      };
    }

    return notif;
  } catch (err) {
    console.warn('[BrowserNotification] Failed to send notification:', err);
    return null;
  }
};

