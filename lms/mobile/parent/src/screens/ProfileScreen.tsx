import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';



export default function ProfileScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [lang, setLang] = useState('en');

  const fetchProfile = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/parent/profile');
      setProfile(res.data);
    } catch (e) { console.warn('API call failed:', e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchProfile(); }, [fetchProfile]);

  if (loading && !refreshing) return <LoadingState />;
  if (!profile) return <ErrorState message="Failed to load profile" onRetry={fetchProfile} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{profile.initials}</Text>
        </View>
        <Text style={styles.parentName}>{profile.name || 'Parent User'}</Text>
        <Text style={styles.schoolName}>{profile.school || 'Genesis Academy'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Language Preferences</Text>
      <View style={styles.card}>
        <View style={styles.langRow}>
          {[
            { code: 'en', label: 'English' },
            { code: 'te', label: 'తెలుగు' },
            { code: 'hi', label: 'हिन्दी' },
          ].map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[styles.langBtn, lang === l.code && styles.activeLangBtn]}
              onPress={() => setLang(l.code)}
            >
              <Text style={[styles.langText, lang === l.code && styles.activeLangText]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Application Information</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App Version</Text>
          <Text style={styles.infoVal}>1.0.0 (Expo SDK 51)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Connected Server</Text>
          <Text style={styles.infoVal}>LMS Production API</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  profileHeader: { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6200ee', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  parentName: { fontSize: 20, fontWeight: 'bold', color: '#212121' },
  schoolName: { fontSize: 13, color: '#666', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#212121', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  langRow: { flexDirection: 'row', justifyContent: 'space-around' },
  langBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  activeLangBtn: { backgroundColor: '#6200ee', borderColor: '#6200ee' },
  langText: { fontSize: 13, color: '#666' },
  activeLangText: { color: '#fff', fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { fontSize: 13, color: '#666' },
  infoVal: { fontSize: 13, fontWeight: '600', color: '#333' },
});
