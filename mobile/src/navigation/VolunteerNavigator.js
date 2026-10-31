import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import AvailableDeliveriesScreen from '../screens/volunteer/AvailableDeliveriesScreen';
import MyDeliveriesScreen from '../screens/volunteer/MyDeliveriesScreen';
import DeliveryDetailScreen from '../screens/volunteer/DeliveryDetailScreen';
import QRScannerScreen from '../screens/volunteer/QRScannerScreen';
import VolunteerProfileScreen from '../screens/volunteer/VolunteerProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function RadarStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="AvailableDeliveries" component={AvailableDeliveriesScreen} />
      <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
    </Stack.Navigator>
  );
}

function DeliveriesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="MyDeliveries" component={MyDeliveriesScreen} />
      <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
    </Stack.Navigator>
  );
}

export default function VolunteerNavigator() {
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
        name="Radar"
        component={RadarStack}
        options={{
          tabBarLabel: 'Radar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DeliveriesTab"
        component={DeliveriesStack}
        options={{
          tabBarLabel: 'My Runs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={QRScannerScreen}
        options={{
          tabBarLabel: 'Scan QR',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={VolunteerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

