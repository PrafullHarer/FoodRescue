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
  const [phone, setPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

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

    if (password.length < 8) {
      Alert.alert('Password Requirement', 'Password must be at least 8 characters long.');
      return;
    }

    if ((role === 'provider' || role === 'ngo') && !organizationName.trim()) {
      Alert.alert('Organization Required', 'Please enter your organization or business name.');
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
              label="Password (min 8 chars) *"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            {(role === 'provider' || role === 'ngo') && (
              <Input
                label={role === 'provider' ? 'Business / Restaurant Name *' : 'Shelter / NGO Name *'}
                value={organizationName}
                onChangeText={setOrganizationName}
                placeholder={role === 'provider' ? 'e.g. Grand Palace Hotel' : 'e.g. Hope Shelter'}
                leftIcon="business-outline"
              />
            )}

            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
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
});
