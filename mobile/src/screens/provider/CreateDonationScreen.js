import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { colors, spacing, radius } from '../../theme/colors';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Header from '../../components/Header';
import Card from '../../components/Card';

const CATEGORIES = [
  { key: 'cooked_meals', label: 'Cooked Meals', icon: 'restaurant' },
  { key: 'bakery', label: 'Bakery', icon: 'pizza' },
  { key: 'fruits_vegetables', label: 'Produce', icon: 'leaf' },
  { key: 'packaged_food', label: 'Packaged Food', icon: 'cube' },
  { key: 'dairy', label: 'Dairy & Eggs', icon: 'water' },
  { key: 'beverages', label: 'Beverages', icon: 'cafe' },
];

const DIETARY_TAGS = [
  'Vegetarian', 'Vegan', 'Halal', 'Nut-Free', 'Gluten-Free', 'Dairy-Free'
];

export default function CreateDonationScreen({ navigation }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('cooked_meals');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('servings');
  const [pickupAddress, setPickupAddress] = useState(user?.address || '');
  const [shelfHours, setShelfHours] = useState('4');
  const [selectedTags, setSelectedTags] = useState(['Vegetarian']);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 3) {
      Alert.alert('Validation Error', 'Please enter a title (at least 3 characters).');
      return;
    }
    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive quantity.');
      return;
    }
    if (!pickupAddress.trim() || pickupAddress.trim().length < 5) {
      Alert.alert('Validation Error', 'Please enter a complete pickup address.');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const hoursAhead = parseInt(shelfHours, 10) || 4;
      const windowStart = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now
      const windowEnd = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
      const expiry = new Date(now.getTime() + (hoursAhead + 2) * 60 * 60 * 1000);

      const description = selectedTags.length > 0
        ? `Dietary: ${selectedTags.join(', ')}`
        : undefined;

      const payload = {
        title: title.trim(),
        description,
        category,
        quantity: parsedQty,
        unit: unit || 'servings',
        pickup_address: pickupAddress.trim(),
        latitude: user?.latitude || 28.6139,
        longitude: user?.longitude || 77.2090,
        pickup_window_start: windowStart.toISOString(),
        pickup_window_end: windowEnd.toISOString(),
        expiry_time: expiry.toISOString(),
        special_instructions: specialInstructions.trim() || undefined,
      };

      await client.post('/donations', payload);
      Alert.alert(
        'Donation Published!',
        'Your surplus listing is live. Local shelters and rescue couriers will be notified immediately.',
        [
          {
            text: 'View My Listings',
            onPress: () => {
              setTitle('');
              setQuantity('');
              setSpecialInstructions('');
              navigation.navigate('MyDonationsTab');
            },
          },
        ]
      );
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        'Failed to publish donation.';
      Alert.alert('Publish Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Post Surplus Food" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionHeading}>Surplus Details</Text>

        <Input
          label="Food Title *"
          placeholder="e.g. 50 Boxes Fresh Veg Biryani & Curry"
          value={title}
          onChangeText={setTitle}
          leftIcon="fast-food-outline"
        />

        <Text style={styles.inputLabel}>Category *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon}
                  size={15}
                  color={isSelected ? colors.white : colors.textMuted}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.row}>
          <View style={{ flex: 1.5 }}>
            <Input
              label="Quantity *"
              placeholder="e.g. 50"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              leftIcon="layers-outline"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Unit"
              placeholder="servings"
              value={unit}
              onChangeText={setUnit}
            />
          </View>
        </View>

        {/* Dietary Tags matching Web */}
        <Text style={styles.inputLabel}>Dietary / Allergen Tags</Text>
        <View style={styles.tagWrap}>
          {DIETARY_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagPill, isSelected && styles.tagPillActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
                  {isSelected ? `✓ ${tag}` : tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionHeading, { marginTop: spacing.md }]}>
          Pickup & Freshness
        </Text>

        <Input
          label="Pickup Address *"
          placeholder="Street address, building, floor..."
          value={pickupAddress}
          onChangeText={setPickupAddress}
          leftIcon="location-outline"
        />

        <Input
          label="Pickup Window (Hours available)"
          placeholder="4"
          value={shelfHours}
          onChangeText={setShelfHours}
          keyboardType="number-pad"
          leftIcon="time-outline"
        />

        <Input
          label="Handling & Allergy Notes"
          placeholder="e.g. Keep warm, contains nuts, pack in insulated boxes..."
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          multiline
          numberOfLines={3}
          leftIcon="alert-circle-outline"
        />

        <Button
          title="Publish Surplus Food"
          icon="checkmark-circle"
          loading={loading}
          onPress={handleSubmit}
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  categoryRow: {
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  categoryChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tagPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.cardHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagPillActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tagTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: spacing.lg,
  },
});
