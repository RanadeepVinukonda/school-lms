import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome Back, Teacher! 👩‍🏫</Text>
        <Text style={styles.subtitle}>Track class performance and pending gradings.</Text>
      </View>

      {/* Class Performance Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Class Performance Overview</Text>
        <View style={styles.performanceRow}>
          <Text style={styles.metricBig}>84%</Text>
          <Text style={styles.metricLabel}>Grade 10A Average Mastery</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '84%' }]} />
        </View>
      </View>

      {/* Pending Gradings */}
      <Text style={styles.sectionTitle}>Grading To-Do Checklist</Text>
      {[
        { title: 'Algebra Midterm Exam (10A)', count: '14 submissions pending', due: 'Due Today' },
        { title: 'Mechanics Lab Report (10B)', count: '8 submissions pending', due: 'Due Tomorrow' }
      ].map((item, idx) => (
        <View key={idx} style={styles.todoItem}>
          <View style={styles.todoDetails}>
            <Text style={styles.todoTitle}>{item.title}</Text>
            <Text style={styles.todoCount}>{item.count}</Text>
          </View>
          <Text style={styles.todoDue}>{item.due}</Text>
        </View>
      ))}

      {/* Quick Stats */}
      <Text style={styles.sectionTitle}>Quick Statistics</Text>
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>96%</Text>
          <Text style={styles.statLabel}>Today's Attendance</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>12</Text>
          <Text style={styles.statLabel}>Active Subjects</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  welcome: { fontSize: 22, fontWeight: 'bold', color: '#212121' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#212121', marginBottom: 12 },
  performanceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  metricBig: { fontSize: 32, fontWeight: 'bold', color: '#6200ee' },
  metricLabel: { fontSize: 12, color: '#666' },
  progressBarBg: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#6200ee' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#212121', marginBottom: 12, marginTop: 12 },
  todoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  todoDetails: { flex: 1 },
  todoTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  todoCount: { fontSize: 12, color: '#666', marginTop: 2 },
  todoDue: { fontSize: 11, fontWeight: 'bold', color: '#ff1744', backgroundColor: '#ffebee', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statsCard: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: 'bold', color: '#6200ee' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4 }
});
