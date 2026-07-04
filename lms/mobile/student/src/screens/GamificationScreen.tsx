import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';

const FALLBACK_DATA = {
  streak: 12,
  coins: 420,
  xp: 1120,
  badges: [
    { title: 'Fast Learner', desc: 'Completed 5 lessons in one day', icon: '⚡' },
    { title: 'Coder Expert', desc: 'Solved python basics milestone', icon: '🐍' },
    { title: 'Tutor Friend', desc: 'Chatted with AI Tutor 10 times', icon: '🤖' },
  ],
  leaderboard: [
    { rank: 1, name: 'Srinivas Murthy', points: 1540, emoji: '🥇' },
    { rank: 2, name: 'Priya Patel', points: 1420, emoji: '🥈' },
    { rank: 3, name: 'Rahul Verma', points: 1390, emoji: '🥉' },
    { rank: 4, name: 'You (Learner)', points: 1120, emoji: '👤' },
  ],
};

export default function GamificationScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/student/gamification');
      setData(res.data);
    } catch { setData(FALLBACK_DATA); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  if (loading && !refreshing) return <LoadingState />;
  if (!data) return <ErrorState message="Failed to load gamification data" onRetry={fetchData} />;

  const d = data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      {/* Stats Overview */}
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>🔥 {d.streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>💎 {d.coins}</Text>
          <Text style={styles.statLabel}>LMS Coins</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>⭐ {d.xp}</Text>
          <Text style={styles.statLabel}>XP Points</Text>
        </View>
      </View>

      {/* Badges */}
      <Text style={styles.sectionTitle}>My Badges</Text>
      {(d.badges || []).length === 0 ? (
        <EmptyState message="No badges earned yet. Keep learning!" />
      ) : (
        <View style={styles.badgeRow}>
          {d.badges.map((b: any, idx: number) => (
            <View key={idx} style={styles.badgeItem}>
              <Text style={styles.badgeIcon}>{b.icon}</Text>
              <Text style={styles.badgeTitle}>{b.title}</Text>
              <Text style={styles.badgeDesc}>{b.desc}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Leaderboard */}
      <Text style={styles.sectionTitle}>Global Student Leaderboard</Text>
      {(d.leaderboard || []).length === 0 ? (
        <EmptyState message="No leaderboard data available yet." />
      ) : (
        <View style={styles.leaderboardCard}>
          {d.leaderboard.map((item: any) => (
            <View key={item.rank} style={styles.leaderboardRow}>
              <Text style={styles.rank}>{item.rank}</Text>
              <Text style={styles.avatar}>{item.emoji}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.points}>{item.points} XP</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  statsCard: { flexDirection: 'row', backgroundColor: '#6200ee', borderRadius: 16, padding: 20, marginBottom: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  statLabel: { fontSize: 11, color: '#e1bee7', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#212121', marginBottom: 12, marginTop: 12 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  badgeItem: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  badgeIcon: { fontSize: 32, marginBottom: 8 },
  badgeTitle: { fontSize: 12, fontWeight: 'bold', color: '#212121', textAlign: 'center' },
  badgeDesc: { fontSize: 9, color: '#666', textAlign: 'center', marginTop: 2 },
  leaderboardCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rank: { fontSize: 14, fontWeight: 'bold', color: '#666', width: 24, textAlign: 'center' },
  avatar: { fontSize: 18, marginRight: 12 },
  name: { flex: 1, fontSize: 14, color: '#333' },
  points: { fontSize: 14, fontWeight: 'bold', color: '#6200ee' }
});
