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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { colors, spacing, radius } from '../../theme/colors';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Logo from '../../components/Logo';

export default function AvailableDeliveriesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'my'
  const [availableMissions, setAvailableMissions] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [availRes, myRes] = await Promise.all([
        client.get('/volunteers/available-missions').catch(() => ({ data: { data: [] } })),
        client.get('/volunteers/my-deliveries').catch(() => ({ data: { data: [] } })),
      ]);

      setAvailableMissions(availRes.data?.data || []);
      setMyDeliveries(myRes.data?.data || []);
    } catch (err) {
      console.warn('Failed to load courier missions:', err.message);
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

  const handleToggleAvailability = async (value) => {
    setIsAvailable(value);
    try {
      await client.patch('/volunteers/availability', { availability: value });
    } catch {
      setIsAvailable(!value);
      Alert.alert('Error', 'Unable to update availability.');
    }
  };

  const handleClaim = async (deliveryId) => {
    setClaimingId(deliveryId);
    try {
      await client.post(`/volunteers/claim-mission/${deliveryId}`);
      Alert.alert('Mission Accepted!', 'Please proceed to the donor location for pickup.', [
        {
          text: 'View Itinerary',
          onPress: () => {
            setActiveTab('my');
            navigation.navigate('DeliveryDetail', { deliveryId });
          },
        },
      ]);
      loadData();
    } catch (err) {
      Alert.alert(
        'Unable to Claim',
        err.response?.data?.message || 'Another courier may have already claimed this run.'
      );
    } finally {
      setClaimingId(null);
    }
  };

  const renderMission = ({ item }) => {
    const donation = item.donation || {};
    const provider = donation.provider || {};
    const ngo = item.ngo || {};
    const isPickupPending = item.status === 'ASSIGNED' || item.status === 'assigned';
    const isInTransit = item.status === 'PICKED_UP' || item.status === 'picked_up' || item.status === 'IN_TRANSIT';

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.foodInfo}>
            <Text style={styles.foodName} numberOfLines={1}>
              {donation.title || 'Prepared Surplus Food'}
            </Text>
            <Text style={styles.categoryBadge}>
              {donation.category?.replace('_', ' ').toUpperCase() || 'COOKED FOOD'} • {donation.servings ? `${donation.servings} Servings` : `${donation.quantity || 1} units`}
            </Text>
          </View>
          <Badge
            text={item.status || 'AVAILABLE'}
            variant={
              item.status === 'COMPLETED'
                ? 'success'
                : item.status === 'PICKED_UP'
                ? 'primary'
                : 'warning'
            }
          />
        </View>

        {/* Route stops matching Web */}
        <View style={styles.routeBox}>
          <View style={styles.routeStop}>
            <View style={[styles.stopDot, { backgroundColor: colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stopLabel}>PICKUP FROM</Text>
              <Text style={styles.stopTitle} numberOfLines={1}>
                {provider.organizationName || provider.name || 'Food Provider'}
              </Text>
              <Text style={styles.stopAddress} numberOfLines={1}>
                {donation.pickupAddress || provider.address || 'Pickup address provided'}
              </Text>
            </View>
          </View>

          <View style={styles.routeConnector} />

          <View style={styles.routeStop}>
            <View style={[styles.stopDot, { backgroundColor: colors.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stopLabel}>DELIVER TO</Text>
              <Text style={styles.stopTitle} numberOfLines={1}>
                {ngo.organizationName || ngo.name || 'Shelter / NGO'}
              </Text>
              <Text style={styles.stopAddress} numberOfLines={1}>
                {ngo.address || 'Shelter dropoff location'}
              </Text>
            </View>
          </View>
        </View>

        {donation.expiryDate || donation.expiresAt || donation.expiry_time ? (
          <View style={styles.urgencyRow}>
            <Ionicons name="time-outline" size={14} color={colors.warning} />
            <Text style={styles.urgencyText}>
              Expires by {new Date(donation.expiryDate || donation.expiresAt || donation.expiry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        {activeTab === 'available' ? (
          <Button
            title="Accept Rescue Mission"
            icon="checkmark-circle"
            loading={claimingId === item._id || claimingId === item.id}
            onPress={() => handleClaim(item._id || item.id)}
            style={{ marginTop: spacing.sm }}
          />
        ) : (
          <View style={styles.actionsRow}>
            <Button
              title="Itinerary"
              variant="outline"
              icon="navigate-outline"
              onPress={() => navigation.navigate('DeliveryDetail', { deliveryId: item._id || item.id })}
              style={{ flex: 1 }}
            />
            {isPickupPending && (
              <Button
                title="Scan Pickup"
                icon="qr-code-outline"
                onPress={() =>
                  navigation.navigate('QRScanner', {
                    deliveryId: item._id || item.id,
                    mode: 'pickup',
                  })
                }
                style={{ flex: 1.2 }}
              />
            )}
            {isInTransit && (
              <Button
                title="Scan Dropoff"
                icon="qr-code-outline"
                onPress={() =>
                  navigation.navigate('QRScanner', {
                    deliveryId: item._id || item.id,
                    mode: 'dropoff',
                  })
                }
                style={{ flex: 1.2 }}
              />
            )}
          </View>
        )}
      </Card>
    );
  };

  const currentList = activeTab === 'available' ? availableMissions : myDeliveries;

  return (
    <View style={styles.container}>
      {/* Header Bar matching Web */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Logo size="sm" subtitle="Courier Rescue Hub" />
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, isAvailable && styles.toggleLabelActive]}>
              {isAvailable ? 'ONLINE' : 'OFFLINE'}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isAvailable ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* Tabs: Available Runs vs My Active Deliveries */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'available' && styles.tabBtnActive]}
            onPress={() => setActiveTab('available')}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'available' && styles.tabBtnTextActive,
              ]}
            >
              Nearby Radar ({availableMissions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'my' && styles.tabBtnActive]}
            onPress={() => setActiveTab('my')}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'my' && styles.tabBtnTextActive,
              ]}
            >
              My Runs ({myDeliveries.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching courier missions...</Text>
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderMission}
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
              <Ionicons
                name={activeTab === 'available' ? 'bicycle-outline' : 'cube-outline'}
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'available' ? 'No Open Missions Nearby' : 'No Active Runs'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'available'
                  ? 'Surplus donations will appear here as soon as shelters reserve food batches.'
                  : 'Claim an open mission from the Nearby Radar tab to begin delivering food.'}
              </Text>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  toggleLabelActive: {
    color: colors.primary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardHighlight,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: colors.textPrimary,
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
    marginBottom: spacing.xs,
  },
  foodInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  categoryBadge: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  routeBox: {
    backgroundColor: colors.cardHighlight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginVertical: spacing.xs,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  routeConnector: {
    width: 2,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: 3,
    marginVertical: 2,
  },
  stopLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  stopTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stopAddress: {
    fontSize: 11,
    color: colors.textMuted,
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  urgencyText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
