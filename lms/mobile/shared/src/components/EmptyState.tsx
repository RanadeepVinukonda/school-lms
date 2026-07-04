import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message: string;
  cta?: string;
}

export default function EmptyState({ icon = '📭', title = 'Nothing here yet', message, cta }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {cta && <Text style={styles.cta}>{cta}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8f9fa' },
  icon: { fontSize: 48, marginBottom: 12, opacity: 0.4 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  message: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },
  cta: { fontSize: 13, color: '#6200ee', fontWeight: '600', marginTop: 12 },
});
