import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { colors, spacing, radius } from '../../theme/colors';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Logo from '../../components/Logo';

const CATEGORIES = [
  { key: 'ALL', label: 'All Surplus' },
  { key: 'cooked_meals', label: 'Cooked' },
  { key: 'bakery', label: 'Bakery' },
  { key: 'fruits_vegetables', label: 'Produce' },
  { key: 'dairy', label: 'Dairy' },
  { key: 'packaged_food', label: 'Packaged' },
];

export default function BrowseDonationsScreen({ navigation }) {
  const [donations, setDonations] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimModalDonation, setClaimModalDonation] = useState(null);
  const [pickupType, setPickupType] = useState('volunteer');
  const [claiming, setClaiming] = useState(false);

  const fetchAvailableDonations = useCallback(async () => {
    try {
      // Backend uses status: 'posted' for publicly claimable donations
      const res = await client.get('/donations', {
        params: { status: 'posted', limit: 50 },
      });
      const list =
        res.data?.data?.donations ||
        (Array.isArray(res.data?.data) ? res.data.data : []);
      setDonations(list);
    } catch (err) {
      console.warn('Failed to fetch surplus donations:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAvailableDonations();
    });
    fetchAvailableDonations();
    return unsubscribe;
  }, [navigation, fetchAvailableDonations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAvailableDonations();
  };

  const handleClaimSubmit = async () => {
    if (!claimModalDonation) return;
    setClaiming(true);
    try {
      const id = claimModalDonation.id || claimModalDonation._id;
      const res = await client.post(`/donations/${id}/claim`, {
        pickupType,
      });

      const message =
        pickupType === 'self_pickup'
          ? 'Donation claimed! Please arrange direct pickup from the donor.'
          : 'Donation claimed! A community volunteer courier is being dispatched.';

      Alert.alert('Claim Confirmed!', message, [
        {
          text: 'View My Claims',
          onPress: () => {
            setClaimModalDonation(null);
            navigation.navigate('MyClaimsTab');
          },
        },
      ]);
      fetchAvailableDonations();
    } catch (err) {
      Alert.alert(
        'Claim Failed',
        err.response?.data?.message || 'Unable to claim donation at this time.'
      );
    } finally {
      setClaiming(false);
    }
  };

  const filtered = donations.filter((item) => {
    const matchesCategory =
      selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      (item.title && item.title.toLowerCase().includes(search.toLowerCase())) ||
      (item.pickup_address && item.pickup_address.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const renderItem = ({ item }) => {
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.infoCol}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemCategory}>
              {item.category?.replace('_', ' ').toUpperCase()} • {item.quantity} {item.unit || 'servings'}
            </Text>
          </View>
          <Badge text="AVAILABLE" variant="success" />
        </View>

        <View style={styles.locationBox}>
          <Ionicons name="location-outline" size={15} color={colors.primary} />
          <Text style={styles.addressText} numberOfLines={1}>
            {item.pickup_address || item.pickupAddress || 'Pickup address provided'}
          </Text>
        </View>

        {item.special_instructions ? (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsText} numberOfLines={2}>
              "{item.special_instructions}"
            </Text>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <View style={styles.expiryCol}>
            <Ionicons name="time-outline" size={14} color={colors.warning} />
            <Text style={styles.expiryText}>
              Expires {new Date(item.expiry_time || item.expiresAt || Date.now() + 14400000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <Button
            title="Claim Surplus"
            icon="hand-right-outline"
            onPress={() => {
              setPickupType('volunteer');
              setClaimModalDonation(item);
            }}
            style={styles.claimBtn}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Logo size="sm" subtitle="Surplus Food Radar" />
          <TouchableOpacity onPress={onRefresh} style={styles.refreshIconBtn}>
            <Ionicons name="refresh" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Search Bar matching Web */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by food or location..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Pills */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.categoryRow}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.key;
            return (
              <TouchableOpacity
                style={[styles.catChip, isSelected && styles.catChipActive]}
                onPress={() => setSelectedCategory(item.key)}
              >
                <Text
                  style={[
                    styles.catChipText,
                    isSelected && styles.catChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching available donations...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
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
              <Ionicons name="restaurant-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Surplus Listings Right Now</Text>
              <Text style={styles.emptySub}>
                All current donations have been claimed. Donors post fresh batches throughout the day!
              </Text>
              <Button
                title="Refresh Feed"
                variant="outline"
                icon="refresh"
                onPress={onRefresh}
                style={{ marginTop: spacing.md }}
              />
            </View>
          }
        />
      )}

      {/* Claim Modal matching Web Choice */}
      <Modal
        visible={!!claimModalDonation}
        transparent
        animationType="slide"
        onRequestClose={() => setClaimModalDonation(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reserve Surplus Food</Text>
            <Text style={styles.modalFoodName}>
              {claimModalDonation?.title} ({claimModalDonation?.quantity} {claimModalDonation?.unit || 'servings'})
            </Text>

            <Text style={styles.pickupOptionLabel}>Redistribution Mode:</Text>

            <TouchableOpacity
              style={[
                styles.pickupOption,
                pickupType === 'volunteer' && styles.pickupOptionActive,
              ]}
              onPress={() => setPickupType('volunteer')}
            >
              <Ionicons
                name="bicycle"
                size={22}
                color={pickupType === 'volunteer' ? colors.primary : colors.textMuted}
              />
              <View style={styles.pickupOptionText}>
                <Text
                  style={[
                    styles.pickupOptionTitle,
                    pickupType === 'volunteer' && styles.pickupOptionTitleActive,
                  ]}
                >
                  Volunteer Courier (Recommended)
                </Text>
                <Text style={styles.pickupOptionSub}>
                  FoodRescue dispatches a nearby courier to transport food to your shelter.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pickupOption,
                pickupType === 'self_pickup' && styles.pickupOptionActive,
              ]}
              onPress={() => setPickupType('self_pickup')}
            >
              <Ionicons
                name="car"
                size={22}
                color={pickupType === 'self_pickup' ? colors.primary : colors.textMuted}
              />
              <View style={styles.pickupOptionText}>
                <Text
                  style={[
                    styles.pickupOptionTitle,
                    pickupType === 'self_pickup' && styles.pickupOptionTitleActive,
                  ]}
                >
                  Direct Self-Pickup
                </Text>
                <Text style={styles.pickupOptionSub}>
                  Your NGO staff or driver will pick up the food directly from the donor location.
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setClaimModalDonation(null)}
                style={styles.modalBtn}
              />
              <Button
                title="Confirm Claim"
                loading={claiming}
                onPress={handleClaimSubmit}
                style={styles.modalBtn}
              />
            </View>
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
  refreshIconBtn: {
    padding: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  categoryRow: {
    gap: spacing.xs,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.cardHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  catChipTextActive: {
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
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardHighlight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  addressText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  instructionsBox: {
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  expiryCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
  },
  claimBtn: {
    paddingHorizontal: spacing.lg,
    height: 40,
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalFoodName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  pickupOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  pickupOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.cardHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pickupOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  pickupOptionText: {
    flex: 1,
  },
  pickupOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pickupOptionTitleActive: {
    color: colors.primary,
  },
  pickupOptionSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
});
