import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';



export default function DashboardScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<Record<string, unknown> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/parent/dashboard');
      setChildren(res.data);
    } catch (e) { console.warn('API call failed:', e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  if (loading && !refreshing) return <LoadingState />;
  if (!children) return <ErrorState message="Failed to load dashboard" onRetry={fetchData} />;

  const childCount = Array.isArray(children) ? children.length : (children?.children || []).length;
  const list = Array.isArray(children) ? children : (children?.children || []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      <Text style={styles.welcome}>Welcome, Parent! 👋</Text>
      <Text style={styles.subtitle}>Stay informed about your children's learning journey.</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{childCount}</Text>
          <Text style={styles.statLabel}>Linked Children</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>Active</Text>
          <Text style={styles.statLabel}>Monitoring</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { fontSize: 14 }]} onPress={() => navigation.navigate('Reports')}>
            View
          </Text>
          <Text style={styles.statLabel}>Weekly Reports</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your Children</Text>
      {list.length === 0 && <EmptyState message="No children linked to your account yet." />}
      {list.map((child: any) => (
        <TouchableOpacity
          key={child.id}
          style={styles.childCard}
          onPress={() => navigation.navigate('Children', { screen: 'ChildDetail', params: { childId: child.id, childName: child.name } })}
        >
          <View style={styles.childHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{child.name.charAt(0)}</Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childClass}>{child.class}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </View>
          <View style={styles.childStats}>
            <View style={styles.childStat}><Text style={styles.childStatVal}>{child.mastery}%</Text><Text style={styles.childStatLabel}>Mastery</Text></View>
            <View style={styles.childStat}><Text style={styles.childStatVal}>{child.attendance}%</Text><Text style={styles.childStatLabel}>Attendance</Text></View>
            <View style={styles.childStat}><Text style={styles.childStatVal}>{child.avgGrade}</Text><Text style={styles.childStatLabel}>Avg Grade</Text></View>
          </View>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Quick Links</Text>
      <View style={styles.quickLinks}>
        <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('Children')}>
          <Text style={styles.linkIcon}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.linkLabel}>View Children</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('Reports')}>
          <Text style={styles.linkIcon}>📊</Text>
          <Text style={styles.linkLabel}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.linkIcon}>👤</Text>
          <Text style={styles.linkLabel}>My Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  welcome: { fontSize: 22, fontWeight: 'bold', color: '#212121' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#6200ee' },
  statLabel: { fontSize: 10, color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#212121', marginBottom: 12, marginTop: 12 },
  childCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  childHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6200ee', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: 'bold', color: '#212121' },
  childClass: { fontSize: 12, color: '#666', marginTop: 2 },
  arrow: { fontSize: 18, color: '#999' },
  childStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  childStat: { flex: 1, alignItems: 'center' },
  childStatVal: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  childStatLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  quickLinks: { flexDirection: 'row', gap: 8 },
  linkCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  linkIcon: { fontSize: 28, marginBottom: 6 },
  linkLabel: { fontSize: 11, color: '#333', fontWeight: '600' },
});
