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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '../components/Logo';
import NativeCameraModal from '../components/NativeCameraModal';
import { colors } from '../theme/colors';

/**
 * Automatically determine the developer computer's host IP from Metro scriptURL.
 * On a physical phone using Expo Go on Wi-Fi, this resolves directly to
 * the host PC's LAN IP (e.g. 10.221.100.64).
 */
const getDevHost = () => {
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
  return '10.221.100.64';
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
  const lastAutoOpenedUrl = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('@foodrescue_custom_web_url').then((saved) => {
      if (saved) setActiveUrl(saved);
    });
  }, []);

  // Handle hardware Android back button to navigate website history
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
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
  }, [cameraOpen, canGoBack]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

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
              onError={() => {
                setLoading(false);
                setErrorOccurred(true);
              }}
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
                    size={54}
                    color={colors.warning}
                    style={{ marginTop: 24 }}
                  />
                  <Text style={styles.errorTitle}>Connecting to Web Client</Text>
                  <Text style={styles.errorSub}>
                    Connecting to FoodRescue frontend at:{'\n'}
                    <Text style={styles.urlText}>{activeUrl}</Text>
                  </Text>

                  <Text style={styles.helpText}>
                    Ensure the frontend server is running:
                    {'\n'}• Run <Text style={styles.codeText}>npm run dev -- --host</Text> in the frontend folder.
                    {'\n'}• Verify your phone and computer are on the same Wi-Fi.
                  </Text>

                  <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} activeOpacity={0.8}>
                    <Ionicons name="refresh" size={18} color="#050505" />
                    <Text style={styles.retryBtnText}>Retry Connection</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
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
    textAlign: 'left',
    marginTop: 16,
    lineHeight: 18,
    alignSelf: 'stretch',
    backgroundColor: '#18181B',
    padding: 12,
    borderRadius: 10,
  },
  codeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#84CC16',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  retryBtnText: {
    color: '#050505',
    fontWeight: '700',
    fontSize: 14,
  },
});
