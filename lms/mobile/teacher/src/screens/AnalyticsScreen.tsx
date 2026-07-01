import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

const MOCK_CLASSES = [
  { id: 'c1', name: 'Grade 10A' },
  { id: 'c2', name: 'Grade 10B' },
  { id: 'c3', name: 'Grade 9A' },
];

const MOCK_OVERVIEW = {
  totalStudents: 32,
  totalAssessments: 8,
  avgScore: 74,
  passRate: 81,
  studentLevelDistribution: { beginner: 6, intermediate: 18, advanced: 8 },
  assessments: [
    { title: 'Algebra Midterm', type: 'exam', avgScore: 78, passRate: 85, attemptCount: 30, released: true },
    { title: 'Geometry Quiz 3', type: 'quiz', avgScore: 65, passRate: 60, attemptCount: 28, released: true },
    { title: 'Statistics Exam', type: 'exam', avgScore: 82, passRate: 90, attemptCount: 25, released: false },
  ],
};

export default function AnalyticsScreen() {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'concepts'>('overview');

  const data = selectedClassId ? MOCK_OVERVIEW : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>Class performance and student insights</Text>

      <View style={styles.pickerRow}>
        {MOCK_CLASSES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.pill, selectedClassId === c.id && styles.activePill]}
            onClick={() => setSelectedClassId(c.id)}
          >
            <Text style={[styles.pillText, selectedClassId === c.id && styles.activePillText]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!selectedClassId && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>Select a class to view analytics</Text>
        </View>
      )}

      {selectedClassId && data && (
        <>
          <View style={styles.tabRow}>
            {(['overview', 'concepts'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onClick={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab === 'overview' ? 'Overview' : 'Concept Mastery'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'overview' && (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}><Text style={styles.statVal}>{data.totalStudents}</Text><Text style={styles.statLabel}>Students</Text></View>
                <View style={styles.statCard}><Text style={styles.statVal}>{data.totalAssessments}</Text><Text style={styles.statLabel}>Assessments</Text></View>
                <View style={styles.statCard}><Text style={styles.statVal}>{data.avgScore}%</Text><Text style={styles.statLabel}>Avg Score</Text></View>
                <View style={styles.statCard}><Text style={styles.statVal}>{data.passRate}%</Text><Text style={styles.statLabel}>Pass Rate</Text></View>
              </View>

              <Text style={styles.sectionTitle}>Student Level Distribution</Text>
              <View style={styles.card}>
                {(['beginner', 'intermediate', 'advanced'] as const).map((level) => {
                  const count = data.studentLevelDistribution[level];
                  const pct = data.totalStudents > 0 ? (count / data.totalStudents) * 100 : 0;
                  return (
                    <View key={level} style={styles.levelRow}>
                      <Text style={styles.levelLabel}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
                      <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
                      <Text style={styles.levelCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>Assessments ({data.assessments.length})</Text>
              {data.assessments.map((a, i) => (
                <View key={i} style={styles.assessmentCard}>
                  <View style={styles.assessmentHeader}>
                    <Text style={styles.assessmentTitle}>{a.title}</Text>
                    <Text style={[styles.badge, a.released ? styles.badgeLive : styles.badgeDraft]}>
                      {a.released ? 'Live' : 'Draft'}
                    </Text>
                  </View>
                  <View style={styles.assessmentMeta}>
                    <Text style={styles.metaItem}>Avg: {a.avgScore}%</Text>
                    <Text style={styles.metaItem}>Pass: {a.passRate}%</Text>
                    <Text style={styles.metaItem}>{a.attemptCount} attempts</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {activeTab === 'concepts' && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🧠</Text>
              <Text style={styles.emptyText}>No concept data available yet.</Text>
              <Text style={styles.emptySubtext}>Create assessments linked to concepts to see mastery here.</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#212121' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 16 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#eee' },
  activePill: { backgroundColor: '#6200ee' },
  pillText: { fontSize: 13, color: '#666' },
  activePillText: { color: '#fff', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.4 },
  emptyText: { fontSize: 15, color: '#666' },
  emptySubtext: { fontSize: 12, color: '#999', marginTop: 4 },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#eee' },
  activeTab: { backgroundColor: '#6200ee' },
  tabText: { fontSize: 13, color: '#666' },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statVal: { fontSize: 24, fontWeight: 'bold', color: '#6200ee' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#212121', marginBottom: 12, marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  levelLabel: { width: 100, fontSize: 13, color: '#333' },
  progressBg: { flex: 1, height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  progressFill: { height: '100%', backgroundColor: '#6200ee' },
  levelCount: { width: 24, textAlign: 'right', fontSize: 13, fontWeight: 'bold', color: '#333' },
  assessmentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  assessmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assessmentTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  badge: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontWeight: 'bold' },
  badgeLive: { backgroundColor: '#e8f5e9', color: '#2e7d32' },
  badgeDraft: { backgroundColor: '#fff3e0', color: '#e65100' },
  assessmentMeta: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metaItem: { fontSize: 12, color: '#666' },
});
