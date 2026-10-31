import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/colors';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  icon,
  leftIcon,
  rightIcon,
  multiline = false,
  numberOfLines = 1,
  style,
  editable = true,
  autoCapitalize = 'none',
}) {
  const [isFocused, setIsFocused] = useState(false);

  const activeLeftIcon = leftIcon || icon;

  const renderIcon = (ic) => {
    if (!ic) return null;
    if (typeof ic === 'string') {
      return <Ionicons name={ic} size={18} color={isFocused ? colors.primary : colors.textMutedDark || '#9CA3AF'} />;
    }
    return ic;
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          !editable && styles.inputDisabled,
          multiline && { height: 24 * numberOfLines + 24, alignItems: 'flex-start' },
        ]}
      >
        {activeLeftIcon && <View style={styles.iconContainer}>{renderIcon(activeLeftIcon)}</View>}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMutedDark || '#9CA3AF'}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          autoCapitalize={autoCapitalize}
        />
        {rightIcon && <View style={styles.rightIconContainer}>{renderIcon(rightIcon)}</View>}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight || '#FFFFFF',
    marginBottom: spacing.xs + 2,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlightDark,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#121A12',
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  rightIconContainer: {
    marginLeft: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textLight || '#FFFFFF',
    paddingVertical: 10,
  },
  inputMultiline: {
    height: '100%',
    paddingTop: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
