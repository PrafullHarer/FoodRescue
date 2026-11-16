import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
  Platform,
  RefreshControl,
  ScrollView,
  NativeModules,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import Logo from '../components/Logo';
import NativeCameraModal from '../components/NativeCameraModal';
import { colors } from '../theme/colors';
import {
  setupNativeNotifications,
  triggerNativeNotification,
  addNotificationResponseListener,
} from '../utils/nativeNotifications';

/**
 * Automatically determine the developer computer's host IP from Expo Constants or Metro scriptURL.
 * On a physical phone using Expo Go on Wi-Fi, this resolves directly to
 * the host PC's current LAN IP (e.g. 10.81.107.64).
 */
export const getDevHost = () => {
  try {
    // 1. In Expo Go / Dev Client, hostUri or debuggerHost contains IP:Port
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.expoGoConfig?.debuggerHost ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      Constants.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }

    // 2. experienceUrl (e.g. "exp://10.81.107.64:8081")
    const expUrl = Constants.experienceUrl;
    if (expUrl && typeof expUrl === 'string') {
      const match = expUrl.replace(/^[a-zA-Z]+:\/\//, '').split('/')[0]?.split(':')[0];
      if (match && match !== 'localhost' && match !== '127.0.0.1') {
        return match;
      }
    }

    // 3. React Native NativeModules SourceCode scriptURL
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
  // 4. Current active Wi-Fi LAN IP of development machine
  return '10.81.107.64';
};

const devHost = getDevHost();

// The FoodRescue frontend Vite dev server runs at port 5173
// devHost (LAN IP) connects over local Wi-Fi for physical phones in Expo Go
export const DEFAULT_WEB_URL = Platform.select({
  web: 'http://localhost:5173',
  android: `http://${devHost}:5173`,
  ios: `http://${devHost}:5173`,
  default: `http://${devHost}:5173`,
});

export default function WebviewReplicaScreen() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeUrl, setActiveUrl] = useState(DEFAULT_WEB_URL);
  const currentUrlRef = useRef(DEFAULT_WEB_URL);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [customIpInput, setCustomIpInput] = useState(devHost);
  const [cachedAuthSession, setCachedAuthSession] = useState(null);
  const lastAutoOpenedUrl = useRef(null);

  const getBaseOrigin = () => {
    const cur = currentUrlRef.current || activeUrl;
    try {
      return cur.split('/')[0] + '//' + cur.split('/')[2];
    } catch {
      return activeUrl;
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('@foodrescue_user_explicit_ip').then((isExplicit) => {
      if (isExplicit === 'true') {
        AsyncStorage.getItem('@foodrescue_custom_web_url').then((saved) => {
          if (saved) {
            setActiveUrl(saved);
            currentUrlRef.current = saved;
            const savedHost = saved.split('://')[1]?.split(':')[0];
            if (savedHost) setCustomIpInput(savedHost);
            return;
          }
          setActiveUrl(DEFAULT_WEB_URL);
          currentUrlRef.current = DEFAULT_WEB_URL;
          setCustomIpInput(devHost);
        });
      } else {
        setActiveUrl(DEFAULT_WEB_URL);
        currentUrlRef.current = DEFAULT_WEB_URL;
        setCustomIpInput(devHost);
      }
    });

    // Check 7-day mobile login persistence session
    AsyncStorage.multiGet([
      '@foodrescue_token',
      '@foodrescue_refresh_token',
      '@foodrescue_auth_expiry',
    ]).then((pairs) => {
      const token = pairs[0]?.[1];
      const refresh = pairs[1]?.[1];
      const expiry = pairs[2]?.[1];
      if (token && expiry) {
        if (Date.now() > Number(expiry)) {
          // 7-day session expired, clear stored session
          AsyncStorage.multiRemove([
            '@foodrescue_token',
            '@foodrescue_refresh_token',
            '@foodrescue_auth_expiry',
            '@foodrescue_user_id',
          ]);
        } else {
          setCachedAuthSession({
            token,
            refreshToken: refresh || '',
            expiresAt: expiry,
          });
        }
      }
    });
  }, []);

  // Initialize native OS notification channel and permissions on phone
  useEffect(() => {
    setupNativeNotifications();

    // Listen for user tapping native notifications in the phone status bar
    const responseSub = addNotificationResponseListener((response) => {
      const targetRoute = response?.notification?.request?.content?.data?.targetRoute;
      if (targetRoute) {
        try {
          const baseOrigin = getBaseOrigin();
          const fullTarget = `${baseOrigin}${targetRoute.startsWith('/') ? '' : '/'}${targetRoute}`;
          setActiveUrl(fullTarget);
        } catch {
          // fallback
        }
      }
    });

    return () => responseSub.remove();
  }, [activeUrl]);

  // Handle hardware Android back button to navigate website history
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (settingsModalOpen) {
        setSettingsModalOpen(false);
        return true;
      }
      if (cameraOpen) {
        setCameraOpen(false);
        return true;
      }
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [cameraOpen, canGoBack, settingsModalOpen]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setErrorOccurred(false);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const handleSaveCustomHost = () => {
    const trimmed = customIpInput.trim();
    if (!trimmed) return;
    let newUrl = trimmed;
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      newUrl = `http://${trimmed}:5173`;
    }
    setActiveUrl(newUrl);
    AsyncStorage.setItem('@foodrescue_custom_web_url', newUrl);
    AsyncStorage.setItem('@foodrescue_user_explicit_ip', 'true');
    setSettingsModalOpen(false);
    setErrorOccurred(false);
    setLoading(true);
  };

  const handleResetToAutoHost = () => {
    const detected = getDevHost();
    const freshUrl = `http://${detected}:5173`;
    setCustomIpInput(detected);
    setActiveUrl(freshUrl);
    AsyncStorage.setItem('@foodrescue_custom_web_url', freshUrl);
    AsyncStorage.removeItem('@foodrescue_user_explicit_ip');
    setSettingsModalOpen(false);
    setErrorOccurred(false);
    setLoading(true);
  };

  // Handle URL change to auto-open camera on QR verification screens
  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    const url = navState.url || '';
    if (url && !url.includes('about:blank')) {
      currentUrlRef.current = url;
    }

    const codeMatch = url.match(/[?&]code=([^&#]+)/);
    const hasCodeParam = Boolean(codeMatch && codeMatch[1]?.trim());

    // If navigating to /qr-scan without a concrete prefilled code, launch native camera
    if (url.includes('/qr-scan') && !hasCodeParam && lastAutoOpenedUrl.current !== url) {
      lastAutoOpenedUrl.current = url;
      setCameraOpen(true);
    } else if (!url.includes('/qr-scan')) {
      lastAutoOpenedUrl.current = null;
    }
  };

  // Handle postMessage from Webview
  const handleWebViewMessage = (event) => {
    try {
      const rawData = event?.nativeEvent?.data;
      if (!rawData) return;

      let data;
      try {
        data = JSON.parse(rawData);
      } catch {
        data = { type: rawData };
      }

      if (data.type === 'OPEN_CAMERA_SCANNER' || data.type === 'OPEN_QR_SCANNER') {
        setCameraOpen(true);
      } else if (data.type === 'ROUTE_CHANGED') {
        const pathname = data.pathname || '';
        const search = data.search || '';
        const codeMatch = search.match(/[?&]code=([^&#]+)/);
        const hasCodeParam = Boolean(codeMatch && codeMatch[1]?.trim());

        if (pathname.includes('/qr-scan') && !hasCodeParam && lastAutoOpenedUrl.current !== data.href) {
          lastAutoOpenedUrl.current = data.href;
          setCameraOpen(true);
        } else if (!pathname.includes('/qr-scan')) {
          lastAutoOpenedUrl.current = null;
        }
      } else if (data.type === 'TRIGGER_NATIVE_NOTIFICATION') {
        console.log('[WebviewBridge] Received TRIGGER_NATIVE_NOTIFICATION:', data.title, data.body);
        triggerNativeNotification(data.title, data.body, data.data || {});
      } else if (data.type === 'USER_AUTHENTICATED' && data.token) {
        const expiresAt = data.expiresAt || String(Date.now() + 7 * 24 * 60 * 60 * 1000);
        AsyncStorage.multiSet([
          ['@foodrescue_token', data.token],
          ['@foodrescue_refresh_token', data.refreshToken || ''],
          ['@foodrescue_auth_expiry', String(expiresAt)],
          ['@foodrescue_user_id', data.userId || ''],
        ]);
        setCachedAuthSession({
          token: data.token,
          refreshToken: data.refreshToken || '',
          expiresAt: String(expiresAt),
        });
      } else if (data.type === 'USER_LOGGED_OUT') {
        AsyncStorage.multiRemove([
          '@foodrescue_token',
          '@foodrescue_refresh_token',
          '@foodrescue_auth_expiry',
          '@foodrescue_user_id',
        ]);
        setCachedAuthSession(null);
      } else if (data.type === 'REQUEST_DEVICE_LOCATION') {
        handleRequestDeviceLocation();
      }
    } catch (err) {
      console.warn('Error processing webview message:', err);
    }
  };

  // Handle native location request from WebView
  const handleRequestDeviceLocation = async () => {
    try {
      console.log('[NativeLocation] Requesting device location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const errorMsg = 'Location permission was denied in device settings.';
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (typeof window.handleNativeLocationError === 'function') {
              window.handleNativeLocationError('${errorMsg}');
            }
            true;
          `);
        }
        return;
      }

      console.log('[NativeLocation] Checking last known location for instant response...');
      // 1. Fast last-known position (< 50ms)
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords && webViewRef.current) {
          const { latitude, longitude, accuracy } = lastKnown.coords;
          console.log('[NativeLocation] Fast last known position available:', latitude, longitude);
          webViewRef.current.injectJavaScript(`
            if (typeof window.handleNativeLocationSuccess === 'function') {
              window.handleNativeLocationSuccess(${latitude}, ${longitude}, ${accuracy || 15});
            }
            window.dispatchEvent(new CustomEvent('foodrescue:location-update', {
              detail: { latitude: ${latitude}, longitude: ${longitude}, accuracy: ${accuracy || 15}, source: 'native_last_known' }
            }));
            true;
          `);
        }
      } catch (lkErr) {
        console.warn('[NativeLocation] Last known not available:', lkErr.message);
      }

      // 2. Fresh high-precision GPS satellite fix
      console.log('[NativeLocation] Fetching live GPS fix...');
      let pos = null;
      try {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch (posErr) {
        console.warn('[NativeLocation] High accuracy slow, trying balanced:', posErr.message);
        try {
          pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch (posErr2) {
          // If fresh fix fails, lastKnown might have already succeeded
          console.warn('[NativeLocation] Both high & balanced fixes failed:', posErr2.message);
        }
      }

      if (pos?.coords && webViewRef.current) {
        const { latitude, longitude, accuracy } = pos.coords;
        console.log('[NativeLocation] Fresh GPS location resolved:', latitude, longitude);
        webViewRef.current.injectJavaScript(`
          if (typeof window.handleNativeLocationSuccess === 'function') {
            window.handleNativeLocationSuccess(${latitude}, ${longitude}, ${accuracy || 10});
          }
          window.dispatchEvent(new CustomEvent('foodrescue:location-update', {
            detail: { latitude: ${latitude}, longitude: ${longitude}, accuracy: ${accuracy || 10}, source: 'native_gps' }
          }));
          window.postMessage(JSON.stringify({
            type: 'DEVICE_LOCATION_SUCCESS',
            latitude: ${latitude},
            longitude: ${longitude},
            accuracy: ${accuracy || 10}
          }), '*');
          true;
        `);
      }
    } catch (err) {
      console.warn('[NativeLocation] Error:', err.message);
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (typeof window.handleNativeLocationError === 'function') {
            window.handleNativeLocationError('${err.message || 'GPS location error'}');
          }
          true;
        `);
      }
    }
  };

  // Handle code scanned by the native hardware camera
  const handleCodeScanned = (scannedCode) => {
    if (!scannedCode) {
      setCameraOpen(false);
      return;
    }

    try {
      const cleanCode = String(scannedCode).trim().toUpperCase();

      // 1. Direct JS injection to instantly populate active scanner page without page reload
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (typeof window.handleNativeQRScanned === 'function') {
            window.handleNativeQRScanned('${cleanCode}');
          }
          true;
        `);
      }

      // 2. Also update URL in case user launched camera from a different route
      const baseOrigin = getBaseOrigin();
      const targetUrl = `${baseOrigin}/qr-scan?code=${encodeURIComponent(cleanCode)}`;
      lastAutoOpenedUrl.current = targetUrl;
      setActiveUrl(targetUrl);
    } catch {
      // fallback
    }
    setCameraOpen(false);
  };

  // Bridge script injected into web pages
  const INJECTED_BRIDGE_JS = `
    (function() {
      window.isFoodRescueNativeApp = true;
      window.openNativeCamera = function() {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'OPEN_CAMERA_SCANNER' }));
        }
      };
      window.sendNativeNotification = function(title, body, data) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'TRIGGER_NATIVE_NOTIFICATION',
            title: title,
            body: body,
            data: data || {}
          }));
        }
      };
      window.requestNativeLocation = function() {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'REQUEST_DEVICE_LOCATION'
          }));
        }
      };

      // Intercept SPA navigation to notify native shell on route transitions
      function notifyRouteChange() {
        try {
          var p = window.location.pathname || '';
          var s = window.location.search || '';
          var h = window.location.href || '';
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ROUTE_CHANGED',
              pathname: p,
              search: s,
              href: h
            }));
          }
        } catch(e) {}
      }

      var origPush = history.pushState;
      history.pushState = function() {
        var res = origPush.apply(this, arguments);
        notifyRouteChange();
        return res;
      };

      var origReplace = history.replaceState;
      history.replaceState = function() {
        var res = origReplace.apply(this, arguments);
        notifyRouteChange();
        return res;
      };

      // 7-day login cookies & session preservation bridge
      try {
        var cToken = '${cachedAuthSession?.token || ''}';
        var cRefresh = '${cachedAuthSession?.refreshToken || ''}';
        var cExpiry = '${cachedAuthSession?.expiresAt || ''}';
        if (cToken && cExpiry && Number(cExpiry) > Date.now()) {
          var remainingSec = Math.floor((Number(cExpiry) - Date.now()) / 1000);
          if (remainingSec > 0) {
            if (!localStorage.getItem('accessToken')) {
              localStorage.setItem('accessToken', cToken);
            }
            if (cRefresh && !localStorage.getItem('refreshToken')) {
              localStorage.setItem('refreshToken', cRefresh);
            }
            if (!localStorage.getItem('foodrescue_auth_expiry')) {
              localStorage.setItem('foodrescue_auth_expiry', cExpiry);
            }
            document.cookie = 'foodrescue_token=' + encodeURIComponent(cToken) + '; path=/; max-age=' + remainingSec + '; SameSite=Lax';
            if (cRefresh) {
              document.cookie = 'foodrescue_refresh=' + encodeURIComponent(cRefresh) + '; path=/; max-age=' + remainingSec + '; SameSite=Lax';
            }
            document.cookie = 'foodrescue_session=active; path=/; max-age=' + remainingSec + '; SameSite=Lax';
            document.cookie = 'foodrescue_expires_at=' + cExpiry + '; path=/; max-age=' + remainingSec + '; SameSite=Lax';
          }
        }
      } catch (err) {}

      window.addEventListener('popstate', notifyRouteChange);
    })();
    true;
  `;

  return (
    <View style={styles.rootContainer}>
      <StatusBar style="light" backgroundColor="#050505" />

      {/* When camera is open, completely unmount WebView so Android's GPU surface is 100% free for CameraView */}
      {cameraOpen ? (
        <NativeCameraModal
          visible={true}
          onClose={() => setCameraOpen(false)}
          onCodeScanned={handleCodeScanned}
        />
      ) : (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.container}>
            <WebView
              ref={webViewRef}
              source={{ uri: activeUrl }}
              style={styles.webView}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadStart={() => {
                setErrorOccurred(false);
                setLoading(true);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={(e) => {
                console.warn('[WebView Error]', e?.nativeEvent?.description);
                setLoading(false);
                setErrorOccurred(true);
              }}
              onHttpError={(e) => {
                if (e?.nativeEvent?.statusCode >= 400) {
                  setErrorOccurred(true);
                }
              }}
              // Suppress Android Chromium default white error page
              renderError={() => <View style={{ flex: 1, backgroundColor: '#050505' }} />}
              // Enable hardware & browser features
              javaScriptEnabled={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              saveFormDataDisabled={false}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              geolocationEnabled={true}
              cacheEnabled={true}
              originWhitelist={['*']}
              mixedContentMode="always"
              pullToRefreshEnabled={true}
              startInLoadingState={true}
              injectedJavaScript={INJECTED_BRIDGE_JS}
              injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE_JS}
              onMessage={handleWebViewMessage}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <Logo size="lg" subtitle="Loading FoodRescue Platform..." />
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginTop: 20 }}
                  />
                </View>
              )}
            />

            {/* Error Fallback if Frontend Server is not reached */}
            {errorOccurred && (
              <ScrollView
                contentContainerStyle={styles.errorContainer}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                  />
                }
              >
                <View style={styles.errorBox}>
                  <Logo size="lg" />
                  <Ionicons
                    name="cloud-offline-outline"
                    size={50}
                    color={colors.warning}
                    style={{ marginTop: 18 }}
                  />
                  <Text style={styles.errorTitle}>Cannot Connect to Server</Text>
                  <Text style={styles.errorSub}>
                    Connecting to frontend at:{'\n'}
                    <Text style={styles.urlText}>{activeUrl}</Text>
                  </Text>

                  <Text style={styles.helpText}>
                    Ensure your phone and computer are on the same Wi-Fi network and frontend is running on your machine.
                  </Text>

                  <View style={styles.errorActions}>
                    <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} activeOpacity={0.8}>
                      <Ionicons name="refresh" size={17} color="#050505" />
                      <Text style={styles.retryBtnText}>Retry Connection</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.changeIpBtn}
                      onPress={() => setSettingsModalOpen(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.changeIpBtnText}>Change Server IP</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* Change Server IP Modal */}
            <Modal
              visible={settingsModalOpen}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setSettingsModalOpen(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Configure Server Host</Text>
                    <TouchableOpacity onPress={() => setSettingsModalOpen(false)}>
                      <Ionicons name="close" size={22} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalDescription}>
                    Enter your computer's Wi-Fi IP address or full server URL:
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={customIpInput}
                    onChangeText={setCustomIpInput}
                    placeholder="e.g. 10.81.107.64"
                    placeholderTextColor="#6B7280"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <TouchableOpacity
                    style={styles.autoDetectBtn}
                    onPress={handleResetToAutoHost}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sparkles" size={15} color={colors.primary} />
                    <Text style={styles.autoDetectBtnText}>Auto-Detect ({getDevHost()})</Text>
                  </TouchableOpacity>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setSettingsModalOpen(false)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSaveCustomHost}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.saveBtnText}>Save & Connect</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#050505',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#050505',
  },
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  webView: {
    flex: 1,
    backgroundColor: '#050505',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 20,
  },
  errorBox: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#232328',
    borderRadius: 20,
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  errorSub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  urlText: {
    color: '#84CC16',
    fontWeight: '700',
  },
  helpText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
    alignSelf: 'stretch',
    backgroundColor: '#18181B',
    padding: 10,
    borderRadius: 10,
  },
  errorActions: {
    flexDirection: 'column',
    width: '100%',
    gap: 10,
    marginTop: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#84CC16',
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
  },
  retryBtnText: {
    color: '#050505',
    fontWeight: '700',
    fontSize: 14,
  },
  changeIpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#232328',
    borderWidth: 1,
    borderColor: '#383842',
    paddingVertical: 11,
    borderRadius: 12,
    width: '100%',
  },
  changeIpBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#232328',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 14,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 10,
  },
  autoDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  autoDetectBtnText: {
    color: '#84CC16',
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#232328',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#84CC16',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#050505',
    fontSize: 13,
    fontWeight: '700',
  },
});
