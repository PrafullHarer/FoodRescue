import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/colors';

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon = null,
  style,
  textStyle,
}) {
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.btnSecondary;
      case 'outline':
        return styles.btnOutline;
      case 'danger':
        return styles.btnDanger;
      default:
        return styles.btnPrimary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.textSecondary;
      case 'outline':
        return styles.textOutline;
      case 'danger':
        return styles.textDanger;
      default:
        return styles.textPrimary;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'outline':
        return colors.primary;
      case 'secondary':
        return colors.textLight || '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return <Ionicons name={icon} size={18} color={getIconColor()} />;
    }
    return icon;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btnBase,
        getButtonStyle(),
        (disabled || loading) && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#FFFFFF'} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{renderIcon()}</View>}
          <Text style={[styles.textBase, getTextStyle(), textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btnBase: {
    height: 50,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnSecondary: {
    backgroundColor: colors.surfaceHighlightDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  textBase: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: colors.textLight || '#FFFFFF',
  },
  textOutline: {
    color: colors.primary,
  },
  textDanger: {
    color: '#FFFFFF',
  },
});
