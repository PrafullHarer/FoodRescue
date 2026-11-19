import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../theme/colors';
import Logo from '../../components/Logo';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [role, setRole] = useState('provider'); // provider, ngo, volunteer
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRules = [
    { id: 'len', label: '8+ characters', met: password.length >= 8 },
    { id: 'upper', label: '1 uppercase (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'lower', label: '1 lowercase (a-z)', met: /[a-z]/.test(password) },
    { id: 'num', label: '1 number (0-9)', met: /[0-9]/.test(password) },
    { id: 'spec', label: '1 special (!@#$%)', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const isPasswordValid = passwordRules.every(r => r.met);
  const metCount = passwordRules.filter(r => r.met).length;

  const roles = [
    { id: 'provider', title: 'Food Provider', icon: 'storefront-outline', desc: 'Post surplus' },
    { id: 'ngo', title: 'NGO / Shelter', icon: 'heart-outline', desc: 'Claim food' },
    { id: 'volunteer', title: 'Courier', icon: 'bicycle-outline', desc: 'Deliveries' },
  ];

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Required Fields', 'Please complete your full name, email, and password.');
      return;
    }

    if (!isPasswordValid) {
      const missing = passwordRules.filter(r => !r.met).map(r => r.label).join(', ');
      Alert.alert('Password Requirement', `Please satisfy all requirements: ${missing}`);
      return;
    }

    if (!confirmPassword) {
      Alert.alert('Confirm Password', 'Please re-enter your password to confirm.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords you entered do not match. Please verify both fields.');
      return;
    }

    if ((role === 'provider' || role === 'ngo') && !organizationName.trim()) {
      Alert.alert('Organization Required', 'Please enter your organization or business name.');
      return;
    }

    if (role === 'ngo' && (!capacity.trim() || parseInt(capacity, 10) <= 0)) {
      Alert.alert('Capacity Required', 'Please enter the current number of people in the NGO.');
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: name.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phone: phone.trim(),
        business_name: role === 'provider' ? organizationName.trim() : undefined,
        organization_name: role === 'ngo' ? organizationName.trim() : undefined,
        capacity: role === 'ngo' ? (parseInt(capacity, 10) || 100) : undefined,
        address: address.trim(),
      });

      Alert.alert(
        'Account Registered!',
        'Your registration is under review. You can track approval status at any time.',
        [
          {
            text: 'Continue',
            onPress: () =>
              navigation.navigate('VerificationPending', { email: email.trim() }),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Top Bar */}
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.textLight} />
            </TouchableOpacity>
            <Logo size="sm" subtitle="Create Account" />
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Join FoodRescue</Text>
            <Text style={styles.subtitle}>
              Turn surplus food into community nourishment
            </Text>
          </View>

          {/* Role Selector Tabs matching Web */}
          <Text style={styles.sectionLabel}>SELECT YOUR ROLE:</Text>
          <View style={styles.roleTabsContainer}>
            {roles.map((r) => {
              const active = role === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleTab, active && styles.roleTabActive]}
                  onPress={() => setRole(r.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={r.icon}
                    size={20}
                    color={active ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.roleTitle, active && styles.roleTitleActive]}>
                    {r.title}
                  </Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Registration Form Card */}
          <Card style={styles.formCard}>
            <Input
              label="Full Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sarah Jenkins"
              leftIcon="person-outline"
            />

            <Input
              label="Email Address *"
              value={email}
              onChangeText={setEmail}
              placeholder="sarah@organization.org"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
            />

            <Input
              label="Create Password *"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            {/* Live Password Requirements Checklist */}
            <View style={styles.passwordRulesContainer}>
              <View style={styles.passwordRulesHeader}>
                <Text style={styles.passwordRulesTitle}>PASSWORD REQUIREMENTS</Text>
                <Text style={[styles.passwordRulesStatus, isPasswordValid && styles.passwordRulesSuccess]}>
                  {metCount} / 5 Met
                </Text>
              </View>
              <View style={styles.passwordRulesGrid}>
                {passwordRules.map((rule) => (
                  <View key={rule.id} style={styles.ruleItem}>
                    <Ionicons
                      name={rule.met ? 'checkmark-circle' : 'ellipse-outline'}
                      size={13}
                      color={rule.met ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.ruleText, rule.met && styles.ruleTextMet]}>
                      {rule.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <Input
              label="Confirm Password *"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
              leftIcon="shield-checkmark-outline"
            />
            {confirmPassword.length > 0 && (
              <View style={styles.matchIndicatorRow}>
                <Ionicons
                  name={password === confirmPassword ? 'checkmark-circle' : 'alert-circle'}
                  size={14}
                  color={password === confirmPassword ? colors.primary : colors.error}
                />
                <Text style={[styles.matchText, { color: password === confirmPassword ? colors.primary : colors.error }]}>
                  {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}

            {(role === 'provider' || role === 'ngo') && (
              <Input
                label={role === 'provider' ? 'Business / Restaurant Name *' : 'Shelter / NGO Name *'}
                value={organizationName}
                onChangeText={setOrganizationName}
                placeholder={role === 'provider' ? 'e.g. Grand Palace Hotel' : 'e.g. Hope Shelter'}
                leftIcon="business-outline"
              />
            )}

            {role === 'ngo' && (
              <Input
                label="NGO Capacity (Number of People) *"
                value={capacity}
                onChangeText={setCapacity}
                placeholder="e.g. 150 people"
                keyboardType="numeric"
                leftIcon="people-outline"
              />
            )}

            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              leftIcon="call-outline"
            />

            <Input
              label="Address / Service Location"
              value={address}
              onChangeText={setAddress}
              placeholder="Street address, city, postal code"
              leftIcon="location-outline"
            />

            <Button
              title="Create FoodRescue Account"
              onPress={handleRegister}
              loading={loading}
              icon="checkmark-circle"
              style={styles.submitBtn}
            />

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already registered? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  titleContainer: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  roleTabsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  roleTab: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  roleTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  roleTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  roleTitleActive: {
    color: colors.primary,
  },
  roleDesc: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  formCard: {
    padding: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  loginText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  loginLink: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  passwordRulesContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  passwordRulesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  passwordRulesTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  passwordRulesStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  passwordRulesSuccess: {
    color: colors.primary,
  },
  passwordRulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
    marginVertical: 2,
  },
  ruleText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  ruleTextMet: {
    color: colors.text,
    fontWeight: '600',
  },
  matchIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
