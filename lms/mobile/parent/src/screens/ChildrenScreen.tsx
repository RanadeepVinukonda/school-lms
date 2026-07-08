import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';



export default function ChildrenScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/parent/children');
      setChildren(res.data);
    } catch (e) { console.warn('API call failed:', e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  if (loading && !refreshing) return <LoadingState />;
  if (!children) return <ErrorState message="Failed to load children" onRetry={fetchData} />;

  const list = Array.isArray(children) ? children : (children?.children || []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      <Text style={styles.title}>My Children</Text>
      <Text style={styles.subtitle}>Select a child to view detailed progress.</Text>

      {list.length === 0 && <EmptyState message="No children linked to your account." />}
      {list.map((child: any) => (
        <TouchableOpacity
          key={child.id}
          style={styles.childCard}
          onPress={() => navigation.navigate('ChildDetail', { childId: child.id, childName: child.name })}
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
