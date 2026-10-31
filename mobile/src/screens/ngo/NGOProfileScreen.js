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

export default function NGOProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    claimedCount: 0,
    mealsReceived: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [claimsRes, impactRes] = await Promise.all([
        client.get('/donations/my-claims').catch(() => ({ data: { data: { donations: [] } } })),
        client.get('/analytics/impact').catch(() => ({ data: { data: null } })),
      ]);

      const list =
        claimsRes.data?.data?.donations ||
        (Array.isArray(claimsRes.data?.data) ? claimsRes.data.data : []);
      const impact = impactRes.data?.data;

      const totalMeals =
        impact?.rescued_servings ??
        list.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

      setStats({
        claimedCount: impact?.completed_donations ?? list.length,
        mealsReceived: totalMeals,
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
      <Header title="Shelter Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Ionicons name="heart" size={36} color={colors.ngo} />
          </View>
          <Text style={styles.ngoName}>
            {user?.organizationName || user?.organization_name || user?.full_name || user?.name || 'Shelter Partner'}
          </Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <View style={styles.badgeWrapper}>
            <Badge text="COMMUNITY SHELTER" variant="ngo" />
          </View>
        </View>

        {/* Impact Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="cube-outline" size={20} color={colors.primary} />
            <Text style={styles.statVal}>{stats.claimedCount}</Text>
            <Text style={styles.statLbl}>Surplus Rescued</Text>
          </Card>

          <Card style={styles.statCard}>
            <Ionicons name="people-outline" size={20} color={colors.accent} />
            <Text style={styles.statVal}>{stats.mealsReceived}</Text>
            <Text style={styles.statLbl}>Meals Distributed</Text>
          </Card>
        </View>

        {/* Shelter Profile Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Shelter Facility</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Organization</Text>
            <Text style={styles.infoVal}>
              {user?.organizationName || user?.organization_name || user?.name || '-'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verification</Text>
            <Badge
              text={user?.verification_status?.toUpperCase() || user?.verificationStatus?.toUpperCase() || 'VERIFIED'}
              variant="success"
            />
          </View>

          {user?.address ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dropoff Facility</Text>
              <Text style={styles.infoVal}>{user.address}</Text>
            </View>
          ) : null}

          {user?.phone || user?.phoneNumber ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Emergency Contact</Text>
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
    borderColor: colors.ngo,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  ngoName: {
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
    fontSize: 20,
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
