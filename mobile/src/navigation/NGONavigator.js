import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import BrowseDonationsScreen from '../screens/ngo/BrowseDonationsScreen';
import MyClaimsScreen from '../screens/ngo/MyClaimsScreen';
import NGOProfileScreen from '../screens/ngo/NGOProfileScreen';
import QRScannerScreen from '../screens/volunteer/QRScannerScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BrowseStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="BrowseDonations" component={BrowseDonationsScreen} />
      <Stack.Screen name="NGOQRScanner" component={QRScannerScreen} />
    </Stack.Navigator>
  );
}

function ClaimsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="MyClaims" component={MyClaimsScreen} />
      <Stack.Screen name="NGOQRScanner" component={QRScannerScreen} />
    </Stack.Navigator>
  );
}

export default function NGONavigator() {
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
        name="BrowseFeedTab"
        component={BrowseStack}
        options={{
          tabBarLabel: 'Surplus Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyClaimsTab"
        component={ClaimsStack}
        options={{
          tabBarLabel: 'My Claims',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bag-check-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={NGOProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

