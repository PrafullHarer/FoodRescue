import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function Logo({ size = 'md', showText = true, subtitle = null, style }) {
  const sizeMap = {
    sm: { img: 28, text: 16, sub: 10 },
    md: { img: 36, text: 18, sub: 11 },
    lg: { img: 48, text: 22, sub: 12 },
    xl: { img: 64, text: 28, sub: 13 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.imageContainer,
          { width: currentSize.img, height: currentSize.img, borderRadius: currentSize.img / 4 },
        ]}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />
      </View>

      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.brandText, { fontSize: currentSize.text }]}>
            Food<Text style={{ color: colors.accent }}>Rescue</Text>
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitleText, { fontSize: currentSize.sub }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imageContainer: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#232328',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandText: {
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitleText: {
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 1,
  },
});

