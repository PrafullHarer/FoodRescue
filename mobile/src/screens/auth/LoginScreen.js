import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { DEFAULT_API_URL } from '../../api/config';
import { colors, radius, spacing } from '../../theme/colors';
import Logo from '../../components/Logo';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';

export default function LoginScreen({ navigation, route }) {
  const { login } = useAuth();
  const [email, setEmail] = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverUrl, setServerUrl] = useState(client.defaults.baseURL || DEFAULT_API_URL);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [customIpInput, setCustomIpInput] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('@foodrescue_custom_api_url').then((saved) => {
      if (saved) setServerUrl(saved);
    });
  }, []);

  const handleLogin = async (customEmail = null, customPass = null) => {
    const loginEmail = (customEmail !== null ? customEmail : email).trim();
    const loginPass = customPass !== null ? customPass : password;

    if (!loginEmail || !loginPass) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(loginEmail, loginPass);
    } catch (err) {
      if (
        err.code === 'ACCOUNT_PENDING_APPROVAL' ||
        err.code === 'ACCOUNT_PENDING_VERIFICATION' ||
        err.message?.toLowerCase().includes('awaiting admin verification')
      ) {
        navigation.navigate('VerificationPending', { email: loginEmail });
      } else {
        Alert.alert('Sign In Failed', err.message || 'Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(demoEmail, demoPass);
  };

  const handleSaveCustomServer = async () => {
    let url = customIpInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    if (!url.includes(':') && !url.includes('.org') && !url.includes('.com')) {
      url = `${url}:3000`;
    }
    if (!url.endsWith('/api')) {
      url = `${url}/api`;
    }

    client.defaults.baseURL = url;
    await AsyncStorage.setItem('@foodrescue_custom_api_url', url);
    setServerUrl(url);
    setServerModalOpen(false);
    Alert.alert('Server Updated', `Connecting to ${url}`);
  };

  const handleResetServer = async () => {
    client.defaults.baseURL = DEFAULT_API_URL;
    await AsyncStorage.removeItem('@foodrescue_custom_api_url');
    setServerUrl(DEFAULT_API_URL);
    setServerModalOpen(false);
    Alert.alert('Server Reset', `Using default ${DEFAULT_API_URL}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Official Brand Logo */}
          <View style={styles.logoHeader}>
            <Logo size="lg" showText={false} />
            <Text style={styles.brandTitle}>
              Food<Text style={{ color: colors.primary }}>Rescue</Text>
            </Text>
            <Text style={styles.brandSubtitle}>
              Surplus Redistribution Platform
            </Text>
          </View>

          {/* Quick 1-Click Demo Logins matching Web */}
          <Card style={styles.demoCard}>
            <Text style={styles.demoHeader}>⚡ Quick 1-Click Demo Logins</Text>
            <View style={styles.demoGrid}>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => handleQuickDemo('provider@foodrescue.org', 'password123')}
                activeOpacity={0.7}
              >
                <Ionicons name="storefront" size={18} color={colors.primary} />
                <View style={styles.demoTextCol}>
                  <Text style={styles.demoRole}>Provider</Text>
                  <Text style={styles.demoSub}>Post Food</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => handleQuickDemo('ngo@foodrescue.org', 'password123')}
                activeOpacity={0.7}
              >
                <Ionicons name="heart" size={18} color={colors.ngo} />
                <View style={styles.demoTextCol}>
                  <Text style={styles.demoRole}>Shelter NGO</Text>
                  <Text style={styles.demoSub}>Claim Food</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => handleQuickDemo('volunteer@foodrescue.org', 'password123')}
                activeOpacity={0.7}
              >
                <Ionicons name="bicycle" size={18} color={colors.accent} />
                <View style={styles.demoTextCol}>
                  <Text style={styles.demoRole}>Courier</Text>
                  <Text style={styles.demoSub}>Deliveries</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => handleQuickDemo('admin@foodrescue.org', 'password123')}
                activeOpacity={0.7}
              >
                <Ionicons name="shield-checkmark" size={18} color={colors.warning} />
                <View style={styles.demoTextCol}>
                  <Text style={styles.demoRole}>Admin</Text>
                  <Text style={styles.demoSub}>Overview</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Sign In Form */}
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Enter your credentials to access your account</Text>

            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="name@organization.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              leftIcon="lock-closed-outline"
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              }
            />

            <Button
              title="Sign In"
              onPress={() => handleLogin()}
              loading={loading}
              icon="log-in-outline"
              style={styles.loginBtn}
            />

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Server Connection Info Pill */}
          <TouchableOpacity
            style={styles.serverPill}
            onPress={() => {
              setCustomIpInput(serverUrl);
              setServerModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.onlineDot} />
            <Text style={styles.serverText} numberOfLines={1}>
              API: {serverUrl}
            </Text>
            <Ionicons name="settings-outline" size={13} color={colors.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Server IP Override Modal */}
      <Modal
        visible={serverModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setServerModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend Server Configuration</Text>
            <Text style={styles.modalSub}>
              Ensure your mobile device and computer are on the same Wi-Fi network.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={customIpInput}
              onChangeText={setCustomIpInput}
              placeholder="10.221.100.64:3000"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Reset Default"
                variant="outline"
                onPress={handleResetServer}
                style={{ flex: 1 }}
              />
              <Button
                title="Save & Connect"
                onPress={handleSaveCustomServer}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  logoHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.xs,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  demoCard: {
    backgroundColor: '#0C0C0E',
    borderColor: '#1E1E24',
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  demoHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  demoBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  demoTextCol: {
    flex: 1,
  },
  demoRole: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  demoSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  formCard: {
    padding: spacing.lg,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  formSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  loginBtn: {
    marginTop: spacing.sm,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  registerLink: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  serverText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    maxWidth: 220,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.cardHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
