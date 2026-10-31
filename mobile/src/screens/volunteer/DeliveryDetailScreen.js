import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { colors, spacing, borderRadius } from '../../theme/colors';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Header from '../../components/Header';

export default function DeliveryDetailScreen({ route, navigation }) {
  const { deliveryId } = route.params || {};
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveryDetails();
  }, [deliveryId]);

  const fetchDeliveryDetails = async () => {
    try {
      const res = await client.get(`/deliveries/${deliveryId}`);
      setDelivery(res.data?.data || null);
    } catch (err) {
      console.warn('Failed to load delivery details:', err.message);
      Alert.alert('Error', 'Unable to fetch delivery information.');
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = (address) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open maps application.');
    });
  };

  const callPhone = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to place phone call.');
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Fetching mission itinerary...</Text>
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.container}>
        <Header title="Mission Itinerary" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Delivery mission not found.</Text>
        </View>
      </View>
    );
  }

  const donation = delivery.donation || {};
  const provider = donation.provider || {};
  const ngo = delivery.ngo || {};
  const status = delivery.status || 'ASSIGNED';
  const isPickupPending = status === 'ASSIGNED';
  const isInTransit = status === 'PICKED_UP' || status === 'IN_TRANSIT';
  const isCompleted = status === 'DELIVERED' || status === 'COMPLETED';

  return (
    <View style={styles.container}>
      <Header title="Mission Itinerary" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.trackingId}>MISSION ID</Text>
              <Text style={styles.trackingValue}>#{(deliveryId || '').slice(-8).toUpperCase()}</Text>
            </View>
            <Badge
              text={status.toUpperCase()}
              variant={isCompleted ? 'success' : isInTransit ? 'primary' : 'warning'}
            />
          </View>
        </Card>

        {/* Food Details */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="fast-food-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Surplus Food Cargo</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Item / Description</Text>
            <Text style={styles.detailValue}>{donation.title || 'Prepared Surplus Food'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity / Servings</Text>
            <Text style={styles.detailValue}>
              {donation.servings ? `${donation.servings} Servings` : `${donation.quantity || 1} units`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{donation.category || 'Cooked Meals'}</Text>
          </View>

          {donation.specialInstructions ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>Handling Notes:</Text>
              <Text style={styles.notesContent}>{donation.specialInstructions}</Text>
            </View>
          ) : null}
        </Card>

        {/* Step 1: Donor Pickup Location */}
        <Card style={[styles.card, isPickupPending && styles.activeCard]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="storefront" size={20} color={colors.accent} />
            <Text style={styles.sectionTitle}>1. Pickup Origin</Text>
          </View>

          <Text style={styles.partyName}>
            {provider.organizationName || provider.name || 'Food Provider'}
          </Text>
          <Text style={styles.partyAddress}>
            {donation.pickupAddress || provider.address || 'Pickup location not specified'}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => openNavigation(donation.pickupAddress || provider.address)}
            >
              <Ionicons name="navigate-outline" size={16} color={colors.accent} />
              <Text style={[styles.actionPillText, { color: colors.accent }]}>Get Directions</Text>
            </TouchableOpacity>

            {(provider.phone || donation.contactNumber) ? (
              <TouchableOpacity
                style={styles.actionPill}
                onPress={() => callPhone(provider.phone || donation.contactNumber)}
              >
                <Ionicons name="call-outline" size={16} color={colors.accent} />
                <Text style={[styles.actionPillText, { color: colors.accent }]}>Call Donor</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>

        {/* Step 2: NGO Destination */}
        <Card style={[styles.card, isInTransit && styles.activeCard]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="home" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>2. Shelter Destination</Text>
          </View>

          <Text style={styles.partyName}>
            {ngo.organizationName || ngo.name || 'Community Shelter / NGO'}
          </Text>
          <Text style={styles.partyAddress}>
            {ngo.address || 'Delivery dropoff address'}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => openNavigation(ngo.address)}
            >
              <Ionicons name="navigate-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionPillText, { color: colors.primary }]}>Get Directions</Text>
            </TouchableOpacity>

            {ngo.phone ? (
              <TouchableOpacity
                style={styles.actionPill}
                onPress={() => callPhone(ngo.phone)}
              >
                <Ionicons name="call-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionPillText, { color: colors.primary }]}>Call Shelter</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>

        {/* Action Button */}
        <View style={styles.bottomActions}>
          {isPickupPending && (
            <Button
              title="Verify Pickup (Scan QR)"
              icon="qr-code-outline"
              onPress={() =>
                navigation.navigate('QRScanner', {
                  deliveryId,
                  mode: 'pickup',
                })
              }
            />
          )}

          {isInTransit && (
            <Button
              title="Complete Dropoff (Scan QR)"
              icon="qr-code-outline"
              onPress={() =>
                navigation.navigate('QRScanner', {
                  deliveryId,
                  mode: 'dropoff',
                })
              }
            />
          )}

          {isCompleted && (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-done-circle" size={24} color={colors.success} />
              <Text style={styles.completedText}>Mission Successfully Completed</Text>
            </View>
          )}
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  statusCard: {
    marginBottom: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingId: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  trackingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  activeCard: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  notesBox: {
    backgroundColor: colors.cardHighlight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  notesContent: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  partyName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  partyAddress: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomActions: {
    marginTop: spacing.sm,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  completedText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
});

