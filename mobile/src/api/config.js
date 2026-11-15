import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

/**
 * Dynamically extract host IP from Expo Constants or Metro bundler scriptURL.
 * When testing on a physical phone via Expo Go, this automatically
 * resolves to your development machine's local Wi-Fi IP address.
 */
export const getDevHostIp = () => {
  try {
    // 1. In Expo Go, hostUri contains the exact IP:Port Metro loaded from (e.g. "10.81.107.64:8081")
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost ||
      Constants.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }

    // 2. Fallback to NativeModules scriptURL
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.split('://')[1];
      if (match) {
        const host = match.split('/')[0]?.split(':')[0];
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
          return host;
        }
      }
    }
  } catch {
    // fallback
  }
  // 3. Current active Wi-Fi LAN IP of this development machine
  return '10.81.107.64';
};

const devHost = getDevHostIp();

/**
 * Backend runs on PORT 3000 (as defined in backend/.env)
 */
export const DEFAULT_API_URL = Platform.select({
  web: 'http://localhost:3000/api',
  android: `http://${devHost}:3000/api`,
  ios: `http://${devHost}:3000/api`,
  default: `http://${devHost}:3000/api`,
});
