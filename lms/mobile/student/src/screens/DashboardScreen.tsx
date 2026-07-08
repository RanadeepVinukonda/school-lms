import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<Record<string, unknown> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/student/dashboard');
      setDashboardData(res.data);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading && !refreshing) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!dashboardData) return <EmptyState message="No dashboard data available yet." />;

  const d = dashboardData;
  const tasks = Array.isArray(d.tasks) ? d.tasks : [];
  const achievements = Array.isArray(d.achievements) ? d.achievements : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}
    >
      <View style={styles.header}>
        <Text style={styles.welcome}>Hello, Learner!</Text>
        <Text style={styles.subtitle}>Track your learning milestones for today.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Overall Mastery</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressPct}>{d.mastery ?? 0}%</Text>
          <Text style={styles.progressLabel}>{d.level ?? 'Beginner'} Level</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${d.mastery ?? 0}%` }]} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
      </View>

      {tasks.length === 0 && <EmptyState message="No upcoming tasks." />}
      {tasks.map((item: any, idx: number) => (
        <View key={idx} style={styles.taskItem}>
          <View style={[styles.taskIndicator, { backgroundColor: item.color || '#6200ee' }]} />
          <View style={styles.taskDetails}>
            <Text style={styles.taskName}>{item.title}</Text>
            <Text style={styles.taskDate}>{item.date}</Text>
          </View>
          <Text style={styles.taskTag}>{item.tag || 'Task'}</Text>
        </View>
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
      </View>
      <View style={styles.card}>
        {achievements.length === 0 && <Text style={styles.activityItem}>No recent achievements.</Text>}
        {achievements.map((item: any, idx: number) => (
          <Text key={idx} style={styles.activityItem}>{item.description || item.title || String(item)}</Text>
        ))}
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
