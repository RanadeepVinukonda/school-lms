import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetworkStore } from '../store/networkStore';

export default function OfflineIndicator() {
  const isOffline = useNetworkStore((state) => state.isOffline);

  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>⚠️ Offline Mode - Showing cached data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#d32f2f',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});
