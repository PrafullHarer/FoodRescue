import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { colors, spacing, radius } from '../../theme/colors';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Header from '../../components/Header';

export default function MyClaimsScreen({ navigation }) {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('all'); // all, active, completed
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClaims = useCallback(async () => {
    try {
      const res = await client.get('/donations/my-claims', {
        params: { limit: 100 },
      });
      const list =
        res.data?.data?.donations ||
        (Array.isArray(res.data?.data) ? res.data.data : []);
      setClaims(list);
    } catch (err) {
      console.warn('Failed to load NGO claims:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchClaims();
    });
    fetchClaims();
    return unsubscribe;
  }, [navigation, fetchClaims]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClaims();
  };

  const filteredClaims = claims.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'active') {
      return (
        item.status === 'claimed' ||
        item.status === 'assigned' ||
        item.status === 'in_transit' ||
        item.status === 'picked_up'
      );
    }
    if (filter === 'completed') {
      return item.status === 'completed' || item.status === 'delivered';
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'claimed':
        return <Badge text="CLAIMED" variant="warning" />;
      case 'assigned':
        return <Badge text="COURIER ASSIGNED" variant="primary" />;
      case 'picked_up':
      case 'in_transit':
        return <Badge text="IN TRANSIT" variant="primary" />;
      case 'delivered':
      case 'completed':
        return <Badge text="COMPLETED" variant="success" />;
      default:
        return <Badge text={status?.toUpperCase() || 'ACTIVE'} variant="neutral" />;
    }
  };

  const renderClaim = ({ item }) => {
    const isCompleted = item.status === 'completed' || item.status === 'delivered';
    const isDropoffReady = item.status === 'in_transit' || item.status === 'picked_up';

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.infoCol}>
            <Text style={styles.claimTitle}>{item.title}</Text>
            <Text style={styles.categorySub}>
              {item.category?.replace('_', ' ').toUpperCase()} • {item.quantity} {item.unit || 'servings'}
            </Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Ionicons name="storefront-outline" size={14} color={colors.primary} />
            <Text style={styles.detailText} numberOfLines={1}>
              Donor: {item.provider_name || item.provider?.organizationName || 'Food Provider'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.pickup_address || item.pickupAddress || 'Pickup address'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="bicycle-outline" size={14} color={colors.accent} />
            <Text style={styles.detailText}>
              Mode: {item.pickup_type === 'self_pickup' ? 'NGO Self-Pickup' : 'Community Courier'}
            </Text>
          </View>
        </View>

        {isDropoffReady && (
          <View style={styles.actionsRow}>
            <Button
              title="Verify Delivery Receipt (Scan QR)"
              icon="qr-code-outline"
              onPress={() =>
                navigation.navigate('NGOQRScanner', {
                  donationId: item.id || item._id,
                  mode: 'dropoff',
                })
              }
              style={{ width: '100%' }}
            />
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBadgeRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.completedBadgeText}>
              Food Rescued & Safely Handed Over
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="My Claimed Food" />

      {/* Tabs matching Web */}
      <View style={styles.tabsRow}>
        {[
          { key: 'all', label: `All (${claims.length})` },
          { key: 'active', label: 'Active Delivery' },
          { key: 'completed', label: 'Completed' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabChip, filter === tab.key && styles.tabChipActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text
              style={[
                styles.tabChipText,
                filter === tab.key && styles.tabChipTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading shelter claims...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredClaims}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={renderClaim}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Claimed Food</Text>
              <Text style={styles.emptySub}>
                Browse available surplus food on the Feed tab to claim meals for your shelter.
              </Text>
              <Button
                title="Browse Feed"
                icon="search"
                style={{ marginTop: spacing.md }}
                onPress={() => navigation.navigate('BrowseFeedTab')}
              />
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  tabChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.cardHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  infoCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  claimTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  categorySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  detailsBox: {
    backgroundColor: colors.cardHighlight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    gap: 4,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  actionsRow: {
    marginTop: spacing.sm,
  },
  completedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  completedBadgeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
