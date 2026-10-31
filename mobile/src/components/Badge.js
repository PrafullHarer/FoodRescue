import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';

export default function Badge({ label, text, variant = 'primary', size = 'md', style, textStyle }) {
  const displayText = label || text || '';

  const getBadgeColors = () => {
    switch (variant?.toLowerCase()) {
      case 'success':
        return { bg: colors.successMuted, text: colors.success, border: 'rgba(34, 197, 94, 0.3)' };
      case 'warning':
        return { bg: colors.warningMuted, text: colors.warning, border: 'rgba(245, 158, 11, 0.3)' };
      case 'danger':
        return { bg: colors.dangerMuted, text: colors.danger, border: 'rgba(239, 68, 68, 0.3)' };
      case 'info':
        return { bg: colors.infoMuted, text: colors.info, border: 'rgba(56, 189, 248, 0.3)' };
      case 'provider':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: colors.provider, border: 'rgba(245, 158, 11, 0.3)' };
      case 'ngo':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: colors.ngo, border: 'rgba(34, 197, 94, 0.3)' };
      case 'volunteer':
        return { bg: 'rgba(56, 189, 248, 0.15)', text: colors.volunteer, border: 'rgba(56, 189, 248, 0.3)' };
      default:
        return { bg: colors.primaryMuted, text: colors.primary, border: 'rgba(22, 163, 74, 0.3)' };
    }
  };

  const c = getBadgeColors();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: c.bg, borderColor: c.border },
        isSm && styles.badgeSm,
        style,
      ]}
    >
      <Text style={[styles.text, { color: c.text }, isSm && styles.textSm, textStyle]}>
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 10,
  },
});
