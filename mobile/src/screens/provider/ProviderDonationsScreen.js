import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Image,
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

export default function ProviderDonationsScreen({ navigation }) {
  const [donations, setDonations] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  const fetchDonations = useCallback(async () => {
    try {
      const res = await client.get('/donations/my');
      const list =
        res.data?.data?.donations ||
        (Array.isArray(res.data?.data) ? res.data.data : []);
      setDonations(list);
    } catch (err) {
      console.warn('Failed to load my donations:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDonations();
    });
    fetchDonations();
    return unsubscribe;
  }, [navigation, fetchDonations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDonations();
  };

  const handleCancelDonation = (id) => {
    Alert.alert(
      'Cancel Listing',
      'Are you sure you want to cancel this surplus food listing?',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.post(`/donations/${id}/cancel`);
              Alert.alert('Success', 'Listing cancelled.');
              fetchDonations();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Could not cancel listing.');
            }
          },
        },
      ]
    );
  };

  const handleShowPickupQR = async (donationId) => {
    setQrLoading(true);
    try {
      const res = await client.get(`/qrcodes/donation/${donationId}`);
      const codes = res.data?.data;
      const pickupCode = Array.isArray(codes)
        ? codes.find((c) => c.type === 'PICKUP' || c.code_type === 'pickup') || codes[0]
        : codes;
      if (!pickupCode) {
        Alert.alert('Info', 'Pickup QR code is generated once a shelter claims this donation.');
        return;
      }
      setSelectedQR(pickupCode);
    } catch {
      Alert.alert('Error', 'Unable to load QR verification code.');
    } finally {
      setQrLoading(false);
    }
  };

  const filteredDonations = donations.filter((d) => {
    if (filter === 'ALL') return true;
    if (filter === 'AVAILABLE') return d.status === 'posted' || d.status === 'available';
    if (filter === 'ACTIVE')
      return (
        d.status === 'claimed' ||
        d.status === 'in_transit' ||
        d.status === 'picked_up'
      );
    if (filter === 'COMPLETED') return d.status === 'completed';
    return true;
  });

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
      case 'cancelled':
        return <Badge text="CANCELLED" variant="danger" />;
      default:
        return <Badge text={status?.toUpperCase() || 'LISTED'} variant="neutral" />;
    }
  };

  const renderItem = ({ item }) => {
    const isAvailable = item.status === 'posted' || item.status === 'available';
    const isClaimed =
      item.status === 'claimed' ||
      item.status === 'picked_up' ||
      item.status === 'in_transit';

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.infoCol}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemCategory}>
              {item.category?.replace('_', ' ').toUpperCase()} • {item.quantity} {item.unit || 'servings'}
            </Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.pickup_address || item.pickupAddress || 'Pickup address'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.detailText}>
              Posted {new Date(item.created_at || item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {isAvailable && (
            <Button
              title="Cancel Listing"
              variant="outline"
              icon="close-circle-outline"
              onPress={() => handleCancelDonation(item.id || item._id)}
              style={styles.actionBtn}
            />
          )}

          {isClaimed && (
            <Button
              title="Show Pickup QR"
              icon="qr-code-outline"
              loading={qrLoading}
              onPress={() => handleShowPickupQR(item.id || item._id)}
              style={styles.actionBtn}
            />
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="My Surplus Food Listings" />

      {/* Filter Tabs matching Web */}
      <View style={styles.filterRow}>
        {[
          { key: 'ALL', label: `All (${donations.length})` },
          { key: 'AVAILABLE', label: 'Active' },
          { key: 'ACTIVE', label: 'Claimed' },
          { key: 'COMPLETED', label: 'Completed' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterChip, filter === tab.key && styles.filterChipActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === tab.key && styles.filterChipTextActive,
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
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDonations}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={renderItem}
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
              <Ionicons name="documents-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Listings Found</Text>
              <Text style={styles.emptySub}>
                {filter === 'ALL'
                  ? 'You have not created any surplus food donations yet.'
                  : `No donations matching status "${filter.toLowerCase()}".`}
              </Text>
            </View>
          }
        />
      )}

      {/* QR Code Presentation Modal */}
      <Modal
        visible={!!selectedQR}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedQR(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.qrModalCard}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Pickup Authorization QR</Text>
              <TouchableOpacity onPress={() => setSelectedQR(null)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.qrModalSub}>
              Present this QR code to the arriving courier to verify physical food handoff.
            </Text>

            <View style={styles.qrContainer}>
              {selectedQR?.qr_image_url || selectedQR?.qrImageUrl ? (
                <Image
                  source={{ uri: selectedQR.qr_image_url || selectedQR.qrImageUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.qrFallbackBox}>
                  <Ionicons name="qr-code" size={130} color={colors.background} />
                  <Text style={styles.qrCodeString}>
                    {selectedQR?.code || selectedQR?.qr_code || 'PICKUP-CODE'}
                  </Text>
                </View>
              )}
            </View>

            <Button
              title="Close"
              variant="outline"
              onPress={() => setSelectedQR(null)}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.cardHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterChipTextActive: {
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
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  detailsBox: {
    backgroundColor: colors.cardHighlight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    gap: 4,
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
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  qrModalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  qrModalSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrFallbackBox: {
    alignItems: 'center',
  },
  qrCodeString: {
    color: colors.background,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
});
