import { Platform } from 'react-native';

/**
 * Safely resolve expo-notifications.
 * In some runtimes (like Expo Go on newer SDKs), push notification native modules
 * (such as ExpoApplication) may not be embedded. We safely catch this so the app
 * loads flawlessly without crashing.
 */
let Notifications = null;
let isChannelConfigured = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (err) {
  console.warn('[NativeNotifications] expo-notifications unavailable in this runtime (e.g. Expo Go):', err?.message || err);
}

/**
 * Setup high-priority Android notification channel & request permissions.
 */
export const setupNativeNotifications = async () => {
  if (!Notifications) {
    console.warn('[NativeNotifications] expo-notifications module not loaded');
    return false;
  }

  let granted = false;

  // 1. Request native permission from the OS (Android 13+ POST_NOTIFICATIONS / iOS)
  try {
    if (Notifications.getPermissionsAsync && Notifications.requestPermissionsAsync) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const res = await Notifications.requestPermissionsAsync();
        finalStatus = res.status;
      }
      granted = finalStatus === 'granted';
      console.log('[NativeNotifications] Permission status:', finalStatus);
    }
  } catch (permErr) {
    console.warn('[NativeNotifications] Permission request error:', permErr?.message || permErr);
  }

  // 2. Setup Android Notification Channel with sound & vibration
  if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
    try {
      await Notifications.setNotificationChannelAsync('foodrescue-alerts', {
        name: 'FoodRescue Alerts',
        description: 'Real-time surplus food donations, claims, and delivery handoffs',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#84CC16',
        enableVibrate: true,
        showBadge: true,
      });
      isChannelConfigured = true;
      console.log('[NativeNotifications] Channel foodrescue-alerts created successfully');
    } catch (channelErr) {
      console.warn('[NativeNotifications] Channel setup error (fallback will be used):', channelErr?.message || channelErr);
      isChannelConfigured = false;
    }
  }

  return granted;
};

/**
 * Trigger an instant native OS notification on the device.
 */
export const triggerNativeNotification = async (title, body, data = {}) => {
  if (!Notifications?.scheduleNotificationAsync) {
    console.warn('[NativeNotifications] scheduleNotificationAsync not available');
    return null;
  }
  try {
    const content = {
      title: title || 'FoodRescue Alert',
      body: body || 'New update available on FoodRescue',
      data: data,
      priority: Notifications.AndroidNotificationPriority?.MAX || Notifications.AndroidNotificationPriority?.HIGH,
      color: '#84CC16',
    };

    if (Platform.OS === 'android' && isChannelConfigured) {
      content.channelId = 'foodrescue-alerts';
    }

    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: null, // null means trigger immediately
    });
    console.log('[NativeNotifications] Notification scheduled successfully, ID:', id);
    return id;
  } catch (err) {
    console.warn('[NativeNotifications] Primary trigger error, attempting fallback:', err?.message || err);
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: title || 'FoodRescue Alert',
          body: body || 'New update available on FoodRescue',
          data: data,
        },
        trigger: null,
      });
      console.log('[NativeNotifications] Notification fallback scheduled, ID:', id);
      return id;
    } catch (fallbackErr) {
      console.warn('[NativeNotifications] Fallback trigger failed:', fallbackErr?.message || fallbackErr);
      return null;
    }
  }
};

/**
 * Listen for notification response (when user taps the notification in the status bar).
 */
export const addNotificationResponseListener = (callback) => {
  if (!Notifications?.addNotificationResponseReceivedListener) {
    return { remove: () => {} };
  }
  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (err) {
    console.warn('[NativeNotifications] addNotificationResponseListener error:', err);
    return { remove: () => {} };
  }
};
