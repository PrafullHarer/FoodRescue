/**
 * Browser & Native Mobile Notification Engine
 * FoodRescue — Universal Cross-Platform Dispatcher
 * 
 * In standard web browsers: uses HTML5 Web Notification API.
 * Inside the React Native mobile app: dispatches directly to native Android OS notifications.
 */

export const isBrowserNotificationSupported = () => {
  if (typeof window === 'undefined') return false;
  if (window.isFoodRescueNativeApp || window.ReactNativeWebView) return true;
  return 'Notification' in window;
};

export const getBrowserNotificationPermission = () => {
  if (typeof window === 'undefined') return 'unsupported';
  if (window.isFoodRescueNativeApp || window.ReactNativeWebView) return 'granted';
  if (!('Notification' in window)) return 'unsupported';
  return window.Notification.permission;
};

export const requestBrowserNotificationPermission = async () => {
  if (typeof window === 'undefined') return 'unsupported';
  if (window.isFoodRescueNativeApp || window.ReactNativeWebView) return 'granted';
  if (!('Notification' in window)) return 'unsupported';

  try {
    const permission = await window.Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[BrowserNotification] Error requesting permission:', err);
    return typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported';
  }
};

export const sendBrowserNotification = (title, options = {}, onClick = null) => {
  if (typeof window === 'undefined') return null;

  // 1. Mobile App Bridge: Forward to native Android notification engine
  if (typeof window.sendNativeNotification === 'function') {
    try {
      window.sendNativeNotification(
        title || 'FoodRescue Alert',
        options.body || options.message || '',
        options.data || {}
      );
      return { native: true };
    } catch (err) {
      console.warn('[Bridge] Failed calling window.sendNativeNotification:', err);
    }
  }

  if (window.ReactNativeWebView?.postMessage) {
    try {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'TRIGGER_NATIVE_NOTIFICATION',
          title: title || 'FoodRescue Alert',
          body: options.body || options.message || '',
          data: options.data || {},
          tag: options.tag || '',
        })
      );
      return { native: true };
    } catch (err) {
      console.warn('[Bridge] Failed to post notification to native phone:', err);
    }
  }

  // 2. Standard Browser Notification (Desktop / Mobile Chrome / Edge / Firefox)
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (window.Notification.permission !== 'granted') return null;

  try {
    const defaultIcon = '/cropped_circle_image.png';
    const notif = new window.Notification(title, {
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
