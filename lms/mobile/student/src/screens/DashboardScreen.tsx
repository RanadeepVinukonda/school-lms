import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Hello, Learner! 👋</Text>
        <Text style={styles.subtitle}>Track your learning milestones for today.</Text>
      </View>

      {/* Mastery Progress */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Overall Mastery</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressPct}>78%</Text>
          <Text style={styles.progressLabel}>Beginner-Intermediate Level</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '78%' }]} />
        </View>
      </View>

      {/* Upcoming Activities */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
      </View>

      {[
        { title: 'Algebra Midterm Exam', date: 'Tomorrow at 9:00 AM', tag: 'Exam', color: '#ff1744' },
        { title: 'Physics Virtual Lab Assignment', date: 'Jul 5, 2026', tag: 'Lab', color: '#00e5ff' },
        { title: 'AI Tutor Conversation practice', date: 'Jul 7, 2026', tag: 'Chat', color: '#7c4dff' }
      ].map((item, idx) => (
        <View key={idx} style={styles.taskItem}>
          <View style={[styles.taskIndicator, { backgroundColor: item.color }]} />
          <View style={styles.taskDetails}>
            <Text style={styles.taskName}>{item.title}</Text>
            <Text style={styles.taskDate}>{item.date}</Text>
          </View>
          <Text style={styles.taskTag}>{item.tag}</Text>
        </View>
      ))}

      {/* Recent Activity */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.activityItem}>🏆 Earned "Phonics Master" Badge in Phonics Sandbox</Text>
        <Text style={styles.activityItem}>💻 Passed Python Basic Coding Challenge (10/10 Score)</Text>
        <Text style={styles.activityItem}>🧬 Completed Water Cycle Virtual Lab Simulation</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  welcome: { fontSize: 24, fontWeight: 'bold', color: '#212121' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#212121', marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  progressPct: { fontSize: 32, fontWeight: 'bold', color: '#6200ee' },
  progressLabel: { fontSize: 12, color: '#666' },
  progressBarBg: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#6200ee' },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  taskItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  taskIndicator: { width: 4, height: 32, borderRadius: 2, marginRight: 12 },
  taskDetails: { flex: 1 },
  taskName: { fontSize: 14, fontWeight: '600', color: '#212121' },
  taskDate: { fontSize: 12, color: '#888', marginTop: 2 },
  taskTag: { fontSize: 11, fontWeight: '700', color: '#6200ee', backgroundColor: '#f1f0fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activityItem: { fontSize: 13, color: '#444', marginBottom: 10, lineHeight: 18 }
});
