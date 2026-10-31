import { Platform, NativeModules } from 'react-native';

/**
 * Dynamically extract host IP from Metro bundler's scriptURL.
 * When testing on a physical phone via Expo Go, this automatically
 * resolves to your development machine's local Wi-Fi IP address.
 */
const getDevHostIp = () => {
  try {
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
  // Local network IP of current development machine
  return '10.221.100.64';
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
