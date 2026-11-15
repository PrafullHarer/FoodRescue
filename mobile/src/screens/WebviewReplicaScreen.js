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
import Logo from '../components/Logo';
import NativeCameraModal from '../components/NativeCameraModal';
import { colors } from '../theme/colors';

/**
 * Automatically determine the developer computer's host IP from Expo Constants or Metro scriptURL.
 * On a physical phone using Expo Go on Wi-Fi, this resolves directly to
 * the host PC's current LAN IP (e.g. 10.81.107.64).
 */
export const getDevHost = () => {
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

    // 2. React Native NativeModules SourceCode
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
  // 3. Current active Wi-Fi LAN IP of development machine
  return '10.81.107.64';
};

const devHost = getDevHost();

// The FoodRescue frontend Vite dev server runs at port 5173
const DEFAULT_WEB_URL = Platform.select({
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [customIpInput, setCustomIpInput] = useState(devHost);
  const lastAutoOpenedUrl = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('@foodrescue_custom_web_url').then((saved) => {
      // Clear outdated 10.221.100.64 IP if previously cached on device
      if (saved && !saved.includes('10.221.100.64')) {
        setActiveUrl(saved);
        const savedHost = saved.split('://')[1]?.split(':')[0];
        if (savedHost) setCustomIpInput(savedHost);
      } else {
        const freshUrl = `http://${devHost}:5173`;
        setActiveUrl(freshUrl);
        setCustomIpInput(devHost);
        AsyncStorage.setItem('@foodrescue_custom_web_url', freshUrl);
      }
    });
  }, []);

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
    setSettingsModalOpen(false);
    setErrorOccurred(false);
    setLoading(true);
  };

  // Handle URL change to auto-open camera on QR verification screens
  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    const url = navState.url || '';
    if (url && !url.includes('about:blank')) {
      setActiveUrl(url);
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
      }
    } catch (err) {
      console.warn('Error processing webview message:', err);
    }
  };

  // Handle code scanned by the native hardware camera
  const handleCodeScanned = (scannedCode) => {
    if (!scannedCode) {
      setCameraOpen(false);
      return;
    }

    try {
      const baseOrigin = activeUrl.split('/')[0] + '//' + activeUrl.split('/')[2];
      const targetUrl = `${baseOrigin}/qr-scan?code=${encodeURIComponent(scannedCode)}`;
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
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              geolocationEnabled={true}
              cacheEnabled={true}
              originWhitelist={['*']}
              mixedContentMode="always"
              pullToRefreshEnabled={true}
              startInLoadingState={true}
              injectedJavaScript={INJECTED_BRIDGE_JS}
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
