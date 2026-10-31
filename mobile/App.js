import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WebviewReplicaScreen from './src/screens/WebviewReplicaScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <WebviewReplicaScreen />
    </SafeAreaProvider>
  );
}
