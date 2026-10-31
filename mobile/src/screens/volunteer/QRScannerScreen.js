import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  Vibration,
  Platform,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { colors } from '../../theme/colors';

export default function QRScannerScreen({ route, navigation }) {
  const { deliveryId, mode = 'pickup' } = route.params || {};
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState('back');

  // -------------------------------------------------------------
  // Precise 4:3 Camera Module Calculations (Portrait 3:4 = 0.75)
  // -------------------------------------------------------------
  const topBarHeight = insets.top + (Platform.OS === 'android' ? 68 : 60);
  const bottomBarHeight = insets.bottom + (Platform.OS === 'android' ? 120 : 110);
  const availableHeight = Math.max(200, SCREEN_HEIGHT - topBarHeight - bottomBarHeight);

  // Determine 4:3 viewport dimensions (width:height = 3:4)
  let cameraWidth = SCREEN_WIDTH;
  let cameraHeight = Math.round(cameraWidth * (4 / 3));

  if (cameraHeight > availableHeight) {
    cameraHeight = availableHeight;
    cameraWidth = Math.round(cameraHeight * (3 / 4));
  }

  // Vertical placement of the 4:3 camera module
  const extraVerticalSpace = Math.max(0, SCREEN_HEIGHT - cameraHeight - topBarHeight - bottomBarHeight);
  const cameraTop = topBarHeight + Math.round(extraVerticalSpace * 0.35);
  const cameraBottom = cameraTop + cameraHeight;
  const sideBarWidth = Math.max(0, Math.floor((SCREEN_WIDTH - cameraWidth) / 2));

  // Reticle dimensions inside 4:3 module
  const FRAME_SIZE = Math.min(Math.round(cameraWidth * 0.68), 260);

  // Auto-request permission if undetermined
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // Continuous neon-green laser scanning line animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scanned && !processing) {
      laserAnim.setValue(0);
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: FRAME_SIZE - 6,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [scanned, processing, FRAME_SIZE]);

  const handleBarcodeScanned = async ({ data }) => {
    if (scanned || processing || !data) return;
    setScanned(true);

    try {
      Vibration.vibrate(100);
    } catch {
      // ignore
    }

    // Clean up code: extract token from URL or raw code string
    let cleanCode = data.trim();
    if (cleanCode.includes('code=')) {
      cleanCode = cleanCode.split('code=')[1].split('&')[0];
    } else if (cleanCode.includes('/')) {
      const parts = cleanCode.split('/');
      cleanCode = parts[parts.length - 1];
    }
    cleanCode = decodeURIComponent(cleanCode).trim().toUpperCase();

    await processHandoffCode(cleanCode);
  };

  const processHandoffCode = async (code) => {
    if (!code || !code.trim()) {
      Alert.alert('Invalid Code', 'Please scan or enter a valid QR code.');
      setScanned(false);
      return;
    }

    setProcessing(true);
    try {
      // 1. Preview code to check validity
      const previewRes = await client.get(`/qr-codes/preview/${encodeURIComponent(code.trim())}`);
      const qrData = previewRes.data?.data;

      // 2. Perform scan confirmation with quality checklist
      const scanRes = await client.post(`/qr-codes/${encodeURIComponent(code.trim())}/scan`, {
        qualityChecklist: {
          temperatureOk: true,
          packagingIntact: true,
          hygieneMaintained: true,
        },
      });

      const message =
        qrData?.type === 'PICKUP' || mode === 'pickup'
          ? 'Pickup Verified! Food surplus is now marked in transit.'
          : 'Delivery Completed! Meals safely delivered to shelter.';

      Alert.alert('Verification Successful!', message, [
        {
          text: 'Done',
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('DeliveriesTab');
            }
          },
        },
      ]);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to verify QR code.';
      Alert.alert('Verification Failed', errMsg, [
        {
          text: 'Try Again',
          onPress: () => {
            setScanned(false);
            setProcessing(false);
          },
        },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return;
    const clean = manualCode.trim().toUpperCase();
    setManualModalVisible(false);
    setManualCode('');
    await processHandoffCode(clean);
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing camera feed...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="camera-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionSub}>
            FoodRescue requires camera permissions to scan pickup & dropoff verification QR codes.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#050505" />
            <Text style={styles.primaryBtnText}>Grant Camera Access</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={18} color="#D1D5DB" />
            <Text style={styles.secondaryBtnText}>Open Device Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualEntryBtnTextOnly}
            onPress={() => setManualModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.manualEntryBtnLabel}>Enter Code Manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Base Layer: Real Hardware Camera Feed (Unrestricted Surface) */}
      <View style={StyleSheet.absoluteFillObject}>
        <CameraView
          style={styles.camera}
          facing={facing}
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned || processing ? undefined : handleBarcodeScanned}
        />
      </View>

      {/* 2. Top Solid Black Bar with Back, Flash & Camera Flip Buttons (No "QR Scanner" title) */}
      <View style={[styles.topBlackBar, { height: cameraTop }]}>
        <View style={[styles.topControlsRow, { paddingTop: insets.top + (Platform.OS === 'android' ? 14 : 10) }]}>
          {/* Back Button on Top Left */}
          <TouchableOpacity
            style={styles.iconCircleButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Top Right Controls: Flash Toggle & Camera Flip */}
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.iconCircleButton, torch && styles.iconCircleButtonActive]}
              onPress={() => setTorch(!torch)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={torch ? 'flash' : 'flash-off'}
                size={20}
                color={torch ? '#050505' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircleButton}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Side Black Bars if cameraWidth is narrower than SCREEN_WIDTH (Preserves exact 4:3) */}
      {sideBarWidth > 0 && (
        <>
          <View style={[styles.sideBlackBar, { top: cameraTop, height: cameraHeight, left: 0, width: sideBarWidth }]} />
          <View style={[styles.sideBlackBar, { top: cameraTop, height: cameraHeight, right: 0, width: sideBarWidth }]} />
        </>
      )}

      {/* 3. 4:3 Camera Module Viewport Overlay with Google Lens Reticle */}
      <View
        style={[
          styles.cameraModule43,
          {
            top: cameraTop,
            width: cameraWidth,
            height: cameraHeight,
            alignSelf: 'center',
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Instruction Pill positioned near top of the 4:3 viewport */}
        <View style={styles.instructionPill}>
          <Ionicons name="scan-outline" size={15} color={colors.primary} />
          <Text style={styles.instructionText}>
            Point at donor or shelter QR code to scan
          </Text>
        </View>

        {/* Centered Transparent Scanning Reticle with 4 Corner Brackets */}
        <View style={[styles.reticleFrame, { width: FRAME_SIZE, height: FRAME_SIZE }]} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Animated Neon-Green Scanning Line with Glow */}
          {!scanned && !processing && (
            <Animated.View
              style={[
                styles.laserLine,
                { transform: [{ translateY: laserAnim }] },
              ]}
            />
          )}

          {/* Verification In Progress Indicator */}
          {processing && (
            <View style={styles.processingBadge}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>Verifying Handoff...</Text>
            </View>
          )}
        </View>
      </View>

      {/* 4. Bottom Solid Black Bar with Manual Code Button & Centered Shutter */}
      <View style={[styles.bottomBlackBar, { top: cameraBottom, bottom: 0 }]}>
        <View style={[styles.bottomControlsRow, { paddingBottom: insets.bottom + (Platform.OS === 'android' ? 24 : 16) }]}>
          {/* Manual Code Option on the Left */}
          <TouchableOpacity
            style={styles.manualCodePill}
            onPress={() => setManualModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="keypad-outline" size={16} color="#FFFFFF" />
            <Text style={styles.manualCodeText}>Manual Code</Text>
          </TouchableOpacity>

          {/* Google Lens Shutter / Scan Button in the Center */}
          <TouchableOpacity
            style={styles.shutterRing}
            onPress={() => {
              try {
                Vibration.vibrate(50);
              } catch {}
            }}
            activeOpacity={0.85}
          >
            <View style={styles.shutterInner}>
              <Ionicons name="search" size={26} color="#050505" />
            </View>
          </TouchableOpacity>

          {/* Right Spacer to preserve exact center alignment for Scan Button */}
          <View style={styles.shutterSpacer} />
        </View>
      </View>

      {/* Manual Code Input Modal */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconBox}>
                <Ionicons name="keypad" size={24} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Enter Verification Code</Text>
            </View>

            <Text style={styles.modalSub}>
              Enter the alphanumeric verification code shown on the donor or shelter screen:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="e.g. RESCUE-PK-A1B2C3"
              placeholderTextColor="#6B7280"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setManualModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleManualSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitText}>Verify Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050505',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '500',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#232328',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(132, 204, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(132, 204, 22, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionSub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
  },
  primaryBtnText: {
    color: '#050505',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 20,
    width: '100%',
    marginTop: 10,
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  manualEntryBtnTextOnly: {
    marginTop: 14,
    paddingVertical: 8,
  },
  manualEntryBtnLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },

  // -------------------------------------------------------------
  // Top Black Letterbox Bar with Controls
  // -------------------------------------------------------------
  topBlackBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    zIndex: 20,
    justifyContent: 'flex-start',
  },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    width: '100%',
  },
  iconCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconCircleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Side Letterbox Bars (For narrow 4:3 displays)
  sideBlackBar: {
    position: 'absolute',
    backgroundColor: '#000000',
    zIndex: 15,
  },

  // -------------------------------------------------------------
  // 4:3 Camera Module Viewport Overlay
  // -------------------------------------------------------------
  cameraModule43: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 10,
    gap: 16,
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  reticleFrame: {
    position: 'relative',
    backgroundColor: 'transparent',
  },

  // Google Lens Curved Corner Brackets
  corner: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 28,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 28,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 28,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 28,
  },

  // Neon-Green Animated Scanning Line with Glow
  laserLine: {
    height: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
    borderRadius: 2,
    width: '100%',
  },
  processingBadge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 18, 20, 0.92)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },

  // -------------------------------------------------------------
  // Bottom Black Letterbox Bar with Controls
  // -------------------------------------------------------------
  bottomBlackBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
  },
  manualCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    width: 125,
    justifyContent: 'center',
  },
  manualCodeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  shutterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  shutterSpacer: {
    width: 125,
  },

  // Modal Dialog for Manual Code Entry
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#232328',
    borderRadius: 24,
    padding: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#1C1C20',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalCancelText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  modalSubmitText: {
    color: '#050505',
    fontSize: 13,
    fontWeight: '700',
  },
});
