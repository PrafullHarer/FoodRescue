import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import ProviderDashboardScreen from '../screens/provider/ProviderDashboardScreen';
import CreateDonationScreen from '../screens/provider/CreateDonationScreen';
import ProviderDonationsScreen from '../screens/provider/ProviderDonationsScreen';
import ProviderProfileScreen from '../screens/provider/ProviderProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="ProviderDashboard" component={ProviderDashboardScreen} />
      <Stack.Screen name="CreateDonation" component={CreateDonationScreen} />
      <Stack.Screen name="ProviderDonations" component={ProviderDonationsScreen} />
    </Stack.Navigator>
  );
}

export default function ProviderNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CreateDonationTab"
        component={CreateDonationScreen}
        options={{
          tabBarLabel: 'Post Surplus',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size + 2} color={colors.primary} />
          ),
        }}
      />
      <Tab.Screen
        name="MyDonationsTab"
        component={ProviderDonationsScreen}
        options={{
          tabBarLabel: 'My Listings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProviderProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

