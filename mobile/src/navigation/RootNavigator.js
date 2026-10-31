import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import Logo from '../components/Logo';

import AuthNavigator from './AuthNavigator';
import VolunteerNavigator from './VolunteerNavigator';
import ProviderNavigator from './ProviderNavigator';
import NGONavigator from './NGONavigator';

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <Logo size="lg" subtitle="Loading Platform..." />
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  const role = user.role?.toLowerCase();

  switch (role) {
    case 'provider':
      return <ProviderNavigator />;
    case 'ngo':
      return <NGONavigator />;
    case 'volunteer':
    default:
      return <VolunteerNavigator />;
  }
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
