import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { colors, spacing, borderRadius } from '../../theme/colors';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';

export default function MyDeliveriesScreen({ navigation }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await client.get('/volunteers/my-deliveries');
      setDeliveries(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to fetch volunteer deliveries:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDeliveries();
    });
    fetchDeliveries();
    return unsubscribe;
  }, [navigation, fetchDeliveries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'ASSIGNED':
        return <Badge text="PICKUP NEEDED" variant="warning" />;
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        return <Badge text="IN TRANSIT" variant="primary" />;
      case 'DELIVERED':
      case 'COMPLETED':
        return <Badge text="COMPLETED" variant="success" />;
      default:
        return <Badge text={status || 'ACTIVE'} variant="info" />;
    }
  };

  const renderDelivery = ({ item }) => {
    const donation = item.donation || {};
    const provider = donation.provider || {};
    const ngo = item.ngo || {};
    const isPickupPending = item.status === 'ASSIGNED' || item.status === 'assigned';
    const isInTransit = item.status === 'PICKED_UP' || item.status === 'picked_up' || item.status === 'IN_TRANSIT';

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.donationTitle} numberOfLines={1}>
              {donation.title || 'Surplus Meal Rescue'}
            </Text>
            <Text style={styles.metaText}>
              ID: {(item._id || item.id || '').slice(-6).toUpperCase()}
            </Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.stopsContainer}>
          <View style={styles.stopItem}>
            <Ionicons name="storefront-outline" size={18} color={colors.accent} />
            <View style={styles.stopDetails}>
              <Text style={styles.stopName}>
                {provider.organizationName || provider.name || 'Provider Location'}
              </Text>
              <Text style={styles.stopAddress} numberOfLines={1}>
                {donation.pickupAddress || provider.address || 'Address provided upon acceptance'}
              </Text>
            </View>
          </View>

          <View style={styles.stopItem}>
            <Ionicons name="home-outline" size={18} color={colors.primary} />
            <View style={styles.stopDetails}>
              <Text style={styles.stopName}>
                {ngo.organizationName || ngo.name || 'NGO Shelter'}
              </Text>
              <Text style={styles.stopAddress} numberOfLines={1}>
                {ngo.address || 'Delivery destination'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Button
            title="View Details"
            variant="outline"
            icon="information-circle-outline"
            style={styles.detailBtn}
            onPress={() => navigation.navigate('DeliveryDetail', { deliveryId: item._id || item.id })}
          />

          {isPickupPending && (
            <Button
              title="Scan Pickup QR"
              variant="primary"
              icon="qr-code-outline"
              style={styles.scanBtn}
              onPress={() =>
                navigation.navigate('QRScanner', {
                  deliveryId: item._id || item.id,
                  mode: 'pickup',
                })
              }
            />
          )}

          {isInTransit && (
            <Button
              title="Scan Dropoff QR"
              variant="primary"
              icon="qr-code-outline"
              style={styles.scanBtn}
              onPress={() =>
                navigation.navigate('QRScanner', {
                  deliveryId: item._id || item.id,
                  mode: 'dropoff',
                })
              }
            />
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Missions</Text>
        <Text style={styles.headerSub}>Manage your active food rescue routes</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading assigned missions...</Text>
        </View>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item._id || item.id}
          renderItem={renderDelivery}
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
              <View style={styles.emptyIconCircle}>
                <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Active Missions</Text>
              <Text style={styles.emptySub}>
                Accept an open mission from the Radar tab to begin delivering food to community shelters.
              </Text>
              <Button
                title="Browse Radar"
                icon="radar"
                style={{ marginTop: spacing.md }}
                onPress={() => navigation.navigate('AvailableDeliveries')}
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
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
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  donationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  stopsContainer: {
    backgroundColor: colors.cardHighlight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stopDetails: {
    flex: 1,
  },
  stopName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stopAddress: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailBtn: {
    flex: 1,
  },
  scanBtn: {
    flex: 1.2,
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
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

