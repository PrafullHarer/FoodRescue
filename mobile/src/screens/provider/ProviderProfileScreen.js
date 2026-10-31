import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { colors, spacing, radius } from '../../theme/colors';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Header from '../../components/Header';

export default function ProviderProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalServings: 0,
    co2SavedKg: 0,
  });

  useEffect(() => {
    fetchProfileStats();
  }, []);

  const fetchProfileStats = async () => {
    try {
      const [donationsRes, impactRes] = await Promise.all([
        client.get('/donations/my').catch(() => ({ data: { data: { donations: [] } } })),
        client.get('/analytics/impact').catch(() => ({ data: { data: null } })),
      ]);

      const list =
        donationsRes.data?.data?.donations ||
        (Array.isArray(donationsRes.data?.data) ? donationsRes.data.data : []);
      const impact = impactRes.data?.data;

      const servings =
        impact?.total_servings ??
        list.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

      setStats({
        totalDonations: impact?.donations_total ?? list.length,
        totalServings: servings,
        co2SavedKg: impact?.co2_saved_kg ?? Math.round(servings * 1.8),
      });
    } catch {
      // keep fallback
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Provider Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Ionicons name="storefront" size={36} color={colors.primary} />
          </View>
          <Text style={styles.orgName}>
            {user?.organizationName || user?.organization_name || user?.full_name || user?.name || 'Food Provider'}
          </Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <View style={styles.badgeWrapper}>
            <Badge text="FOOD PROVIDER" variant="primary" />
          </View>
        </View>

        {/* Impact Metrics matching Web */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="gift-outline" size={20} color={colors.primary} />
            <Text style={styles.statVal}>{stats.totalDonations}</Text>
            <Text style={styles.statLbl}>Donations</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="restaurant-outline" size={20} color={colors.accent} />
            <Text style={styles.statVal}>{stats.totalServings}</Text>
            <Text style={styles.statLbl}>Servings Fed</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="earth-outline" size={20} color={colors.success} />
            <Text style={styles.statVal}>{stats.co2SavedKg} kg</Text>
            <Text style={styles.statLbl}>CO₂ Saved</Text>
          </Card>
        </View>

        {/* Organization Information */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Account & Organization</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Organization Name</Text>
            <Text style={styles.infoVal}>
              {user?.organizationName || user?.organization_name || user?.name || '-'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verification Status</Text>
            <Badge
              text={user?.verification_status?.toUpperCase() || user?.verificationStatus?.toUpperCase() || 'VERIFIED'}
              variant="success"
            />
          </View>

          {user?.address ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pickup Location</Text>
              <Text style={styles.infoVal}>{user.address}</Text>
            </View>
          ) : null}

          {user?.phone || user?.phoneNumber ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoVal}>{user.phone || user.phoneNumber}</Text>
            </View>
          ) : null}
        </Card>

        <View style={styles.actions}>
          <Button
            title="Sign Out"
            variant="danger"
            icon="log-out-outline"
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  orgName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgeWrapper: {
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: 0,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  statLbl: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: '65%',
    textAlign: 'right',
  },
  actions: {
    marginTop: spacing.sm,
  },
});
