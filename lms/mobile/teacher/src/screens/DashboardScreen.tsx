import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';


export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/teacher/dashboard');
      setData(res.data);
    } catch (e) { console.warn('Failed to load dashboard:', e instanceof Error ? e.message : String(e)); setError('Could not load dashboard.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  if (loading && !refreshing) return <LoadingState />;
  if (!data) return <ErrorState message="Failed to load dashboard" onRetry={fetchData} />;

  const d = data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome Back, {d.welcomeName}! 👩‍🏫</Text>
        <Text style={styles.subtitle}>Track class performance and pending gradings.</Text>
      </View>

      {/* Class Performance Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Class Performance Overview</Text>
        <View style={styles.performanceRow}>
          <Text style={styles.metricBig}>{d.classPct}%</Text>
          <Text style={styles.metricLabel}>{d.classLabel}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${d.classPct}%` }]} />
        </View>
      </View>

      {/* Pending Gradings */}
      <Text style={styles.sectionTitle}>Grading To-Do Checklist</Text>
      {(d.pendingGradings || []).length === 0 ? (
        <EmptyState message="No pending gradings—all caught up!" />
      ) : (
        d.pendingGradings.map((item: any, idx: number) => (
          <View key={idx} style={styles.todoItem}>
            <View style={styles.todoDetails}>
              <Text style={styles.todoTitle}>{item.title}</Text>
              <Text style={styles.todoCount}>{item.count}</Text>
            </View>
            <Text style={styles.todoDue}>{item.due}</Text>
          </View>
        ))
      )}

      {/* Quick Stats */}
      <Text style={styles.sectionTitle}>Quick Statistics</Text>
      <View style={styles.statsCard}>
        {(d.quickStats || []).map((s: any, i: number) => (
          <View key={i} style={styles.statItem}>
            <Text style={styles.statVal}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
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
