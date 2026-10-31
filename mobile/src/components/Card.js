import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';

export default function Card({ children, style, onPress, activeOpacity = 0.8 }) {
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        style={[styles.card, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
});

