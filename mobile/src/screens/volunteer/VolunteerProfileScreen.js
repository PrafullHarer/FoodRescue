import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { colors, spacing, radius } from '../../theme/colors';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Header from '../../components/Header';

export default function VolunteerProfileScreen() {
  const { user, logout } = useAuth();
  const [isAvailable, setIsAvailable] = useState(true);
  const [stats, setStats] = useState({
    completedDeliveries: 0,
    totalMeals: 0,
    rating: 4.9,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [deliveriesRes, impactRes] = await Promise.all([
        client.get('/volunteers/my-deliveries').catch(() => ({ data: { data: [] } })),
        client.get('/analytics/impact').catch(() => ({ data: { data: null } })),
      ]);

      const deliveries = deliveriesRes.data?.data || [];
      const completed = deliveries.filter(
        (d) => d.status === 'DELIVERED' || d.status === 'COMPLETED'
      );
      const impact = impactRes.data?.data;

      setStats({
        completedDeliveries: impact?.completed_donations ?? completed.length,
        totalMeals: impact?.rescued_servings ?? completed.length * 25,
        rating: 4.9,
      });
    } catch {
      // keep fallback
    }
  };

  const handleToggleAvailability = async (value) => {
    setIsAvailable(value);
    try {
      await client.patch('/volunteers/availability', { availability: value });
    } catch {
      setIsAvailable(!value);
      Alert.alert('Error', 'Unable to update availability.');
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
      <Header title="Courier Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {(user?.full_name || user?.name || 'V')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.full_name || user?.name || 'Rescue Courier'}
          </Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <View style={styles.roleBadgeContainer}>
            <Badge text="RESCUE COURIER" variant="primary" />
          </View>
        </View>

        {/* Impact Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="bicycle" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{stats.completedDeliveries}</Text>
            <Text style={styles.statLabel}>Runs Done</Text>
          </Card>

          <Card style={styles.statCard}>
            <Ionicons name="restaurant" size={20} color={colors.accent} />
            <Text style={styles.statValue}>{stats.totalMeals}</Text>
            <Text style={styles.statLabel}>Meals Rescued</Text>
          </Card>

          <Card style={styles.statCard}>
            <Ionicons name="star" size={20} color={colors.warning} />
            <Text style={styles.statValue}>{stats.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </Card>
        </View>

        {/* Courier Status Setting */}
        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Available for Missions</Text>
              <Text style={styles.settingSub}>
                {isAvailable
                  ? 'Active — You receive alerts for nearby rescue runs'
                  : 'Offline — New mission alerts are paused'}
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isAvailable ? colors.primary : colors.textMuted}
            />
          </View>
        </Card>

        {/* Account Info */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Courier Credentials</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoVal}>Volunteer Courier</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verification</Text>
            <Badge
              text={user?.verification_status?.toUpperCase() || user?.verificationStatus?.toUpperCase() || 'VERIFIED'}
              variant="success"
            />
          </View>
          {user?.phone || user?.phoneNumber ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact</Text>
              <Text style={styles.infoVal}>{user.phone || user.phoneNumber}</Text>
            </View>
          ) : null}
        </Card>

        {/* Actions */}
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
  avatarInitials: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  roleBadgeContainer: {
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
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  settingCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  card: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  sectionTitle: {
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
  },
  actions: {
    marginTop: spacing.sm,
  },
});
