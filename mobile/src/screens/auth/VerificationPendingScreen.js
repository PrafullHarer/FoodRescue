import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { colors, spacing, radius } from '../../theme/colors';
import Logo from '../../components/Logo';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Badge from '../../components/Badge';

export default function VerificationPendingScreen({ route, navigation }) {
  const { logout } = useAuth();
  const email = route?.params?.email || '';
  const [checking, setChecking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('PENDING');

  const checkStatus = async () => {
    if (!email) {
      Alert.alert('Info', 'Please sign in again to verify account status.');
      navigation.navigate('Login');
      return;
    }
    setChecking(true);
    try {
      const res = await client.get(`/auth/verification-status?email=${encodeURIComponent(email)}`);
      const status =
        res.data?.data?.verification_status ||
        res.data?.data?.verificationStatus ||
        res.data?.data?.status;

      if (status === 'APPROVED' || status === 'approved') {
        setCurrentStatus('APPROVED');
        Alert.alert(
          'Account Approved!',
          'Your organization credentials have been approved by administrators. You can now sign in.',
          [{ text: 'Sign In Now', onPress: () => navigation.navigate('Login', { email }) }]
        );
      } else if (status === 'REJECTED' || status === 'rejected') {
        setCurrentStatus('REJECTED');
        Alert.alert(
          'Verification Not Approved',
          'Your credentials could not be verified at this time. Please contact support@foodrescue.org for assistance.'
        );
      } else {
        setCurrentStatus('PENDING');
        Alert.alert(
          'Application In Review',
          'Our team is actively reviewing your organization information. You will receive an email upon approval.'
        );
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Unable to check verification status.');
    } finally {
      setChecking(false);
    }
  };

  const handleBackToLogin = async () => {
    await logout();
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoCenter}>
          <Logo size="lg" subtitle="Account Security & Compliance" />
        </View>

        <Text style={styles.title}>Account Under Review</Text>
        <Text style={styles.subtitle}>
          To safeguard surplus food hygiene and maintain trust across our shelter network, every provider and courier account is reviewed by administrators.
        </Text>

        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Verification Status</Text>
            <Badge
              text={currentStatus.toUpperCase()}
              variant={
                currentStatus === 'APPROVED'
                  ? 'success'
                  : currentStatus === 'REJECTED'
                  ? 'danger'
                  : 'warning'
              }
            />
          </View>
          {email ? (
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
              <Text style={styles.emailText}>{email}</Text>
            </View>
          ) : null}
          <Text style={styles.infoText}>
            Reviews typically conclude within 12 business hours. You will receive an email notification as soon as verification completes.
          </Text>
        </Card>

        <View style={styles.actionContainer}>
          <Button
            title="Check Approval Status"
            onPress={checkStatus}
            loading={checking}
            icon="refresh"
            style={styles.checkButton}
          />

          <Button
            title="Back to Sign In"
            variant="outline"
            onPress={handleBackToLogin}
            icon="arrow-back"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  logoCenter: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  statusCard: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  emailText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  actionContainer: {
    gap: spacing.sm,
  },
  checkButton: {
    marginBottom: spacing.xs,
  },
});
