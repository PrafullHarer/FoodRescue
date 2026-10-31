import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { colors, spacing, radius } from '../../theme/colors';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Logo from '../../components/Logo';

export default function ProviderDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [impactStats, setImpactStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadData = useCallback(async () => {
    try {
      const [donationsRes, impactRes] = await Promise.all([
        client.get('/donations/my').catch(() => ({ data: { data: { donations: [] } } })),
        client.get('/analytics/impact').catch(() => ({ data: { data: null } })),
      ]);

      const donationsData =
        donationsRes.data?.data?.donations ||
        (Array.isArray(donationsRes.data?.data) ? donationsRes.data.data : []);
      setDonations(donationsData);

      if (impactRes.data?.data) {
        setImpactStats(impactRes.data.data);
      }
    } catch (err) {
      console.warn('Dashboard data fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    loadData();
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalDonations = impactStats?.donations_total ?? donations.length;
  const totalServings =
    impactStats?.total_servings ??
    donations.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
  const co2SavedKg =
    impactStats?.co2_saved_kg ??
    Math.round(totalServings * 1.8);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'posted':
      case 'available':
        return <Badge text="ACTIVE" variant="success" />;
      case 'claimed':
        return <Badge text="CLAIMED" variant="warning" />;
      case 'picked_up':
      case 'in_transit':
        return <Badge text="IN TRANSIT" variant="primary" />;
      case 'completed':
        return <Badge text="COMPLETED" variant="info" />;
      default:
        return <Badge text={status?.toUpperCase() || 'LISTED'} variant="neutral" />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar with Web-style Logo and User Avatar */}
      <View style={styles.topBar}>
        <Logo size="sm" subtitle="Food Provider" />
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => navigation.navigate('ProfileTab')}
        >
          <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <Text style={styles.greetingText}>
            {getGreeting()},{' '}
            <Text style={{ color: colors.textPrimary }}>
              {user?.full_name || user?.name || user?.organizationName || 'Partner'}
            </Text>
          </Text>
          <View style={styles.verifiedRow}>
            <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
            <Text style={styles.verifiedText}>Verified Food Redistribution Partner</Text>
          </View>
        </View>

        {/* Quick Action Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={styles.heroTitle}>Post Surplus Food</Text>
              <Text style={styles.heroSub}>
                List surplus meals, produce, or bakery items to reach verified local shelters in minutes.
              </Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="restaurant" size={26} color={colors.primary} />
            </View>
          </View>
          <Button
            title="Create Surplus Listing"
            icon="add-circle"
            onPress={() => navigation.navigate('CreateDonationTab')}
            style={styles.heroBtn}
          />
        </Card>

        {/* Impact Stat Cards matching Web KPIs */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <View style={styles.statIconRow}>
              <Ionicons name="cube-outline" size={18} color={colors.primary} />
              <Text style={styles.statLabel}>Total Listings</Text>
            </View>
            <Text style={styles.statValue}>{totalDonations}</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statIconRow}>
              <Ionicons name="people-outline" size={18} color={colors.accent} />
              <Text style={styles.statLabel}>Servings Fed</Text>
            </View>
            <Text style={styles.statValue}>{totalServings}</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statIconRow}>
              <Ionicons name="earth-outline" size={18} color={colors.success} />
              <Text style={styles.statLabel}>CO₂ Saved</Text>
            </View>
            <Text style={styles.statValue}>{co2SavedKg} kg</Text>
          </Card>
        </View>

        {/* Recent Listings Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Food Listings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyDonationsTab')}>
            <Text style={styles.seeAllText}>View All ({donations.length})</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : donations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="fast-food-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Listings Yet</Text>
            <Text style={styles.emptySub}>
              Post your surplus food to start rescuing meals and tracking ESG impact.
            </Text>
            <Button
              title="Post First Listing"
              variant="outline"
              icon="add"
              onPress={() => navigation.navigate('CreateDonationTab')}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        ) : (
          donations.slice(0, 5).map((item) => (
            <Card key={item.id || item._id} style={styles.donationCard}>
              <View style={styles.donationHeader}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.donationTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.donationMeta}>
                    {item.category?.replace('_', ' ').toUpperCase()} • {item.quantity} {item.unit || 'servings'}
                  </Text>
                </View>
                {getStatusBadge(item.status)}
              </View>

              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.addressText} numberOfLines={1}>
                  {item.pickup_address || item.pickupAddress || 'Pickup address'}
                </Text>
              </View>

              <View style={styles.donationFooter}>
                <Text style={styles.timeText}>
                  {new Date(item.created_at || item.createdAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <TouchableOpacity
                  style={styles.detailsLink}
                  onPress={() => navigation.navigate('MyDonationsTab')}
                >
                  <Text style={styles.detailsLinkText}>Manage</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  welcomeBanner: {
    marginBottom: spacing.md,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: -0.3,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  verifiedText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#0C0C0E',
    borderColor: '#1E1E24',
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  heroSub: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: 3,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBtn: {
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.sm + 2,
    marginBottom: 0,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  seeAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  loadingBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  donationCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  donationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  donationMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  addressText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  donationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
