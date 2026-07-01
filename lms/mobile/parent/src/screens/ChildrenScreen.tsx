import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

const MOCK_CHILDREN = [
  { id: 'ch1', name: 'Arjun S.', class: 'Grade 10A', school: 'Genesis Academy', mastery: 78, attendance: 94, avgGrade: 'B+' },
  { id: 'ch2', name: 'Priya S.', class: 'Grade 8B', school: 'Genesis Academy', mastery: 92, attendance: 98, avgGrade: 'A' },
];

export default function ChildrenScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Children</Text>
      <Text style={styles.subtitle}>Select a child to view detailed progress.</Text>

      {MOCK_CHILDREN.map((child) => (
        <TouchableOpacity
          key={child.id}
          style={styles.childCard}
          onClick={() => navigation.navigate('ChildDetail', { childId: child.id, childName: child.name })}
        >
          <View style={styles.childRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{child.name.charAt(0)}</Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childMeta}>{child.class} · {child.school}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </View>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{child.mastery}%</Text>
              <Text style={styles.metricLabel}>Mastery</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{child.attendance}%</Text>
              <Text style={styles.metricLabel}>Attendance</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{child.avgGrade}</Text>
              <Text style={styles.metricLabel}>Avg Grade</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#212121' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 20 },
  childCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  childRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6200ee', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  childInfo: { flex: 1 },
  childName: { fontSize: 17, fontWeight: 'bold', color: '#212121' },
  childMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  arrow: { fontSize: 20, color: '#999' },
  metrics: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  metric: { flex: 1, alignItems: 'center' },
  metricVal: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  metricLabel: { fontSize: 10, color: '#666', marginTop: 2 },
});
