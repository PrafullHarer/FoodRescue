import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/colors';
import Logo from './Logo';

export default function Header({
  title,
  subtitle,
  onBack,
  showLogo = false,
  logoSubtitle = null,
  rightComponent,
  rightAction,
  style,
}) {
  const right = rightAction || rightComponent;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftRow}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}

        {showLogo ? (
          <Logo size="sm" subtitle={logoSubtitle || subtitle} />
        ) : (
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {right ? <View style={styles.rightContainer}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg + 4,
    paddingBottom: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 1,
  },
  rightContainer: {
    marginLeft: spacing.sm,
  },
});
