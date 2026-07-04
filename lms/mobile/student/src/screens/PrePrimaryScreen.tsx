import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';

const FALLBACK_CONTENT = {
  phonics: [
    { char: 'A', sound: 'Apple' },
    { char: 'B', sound: 'Ball' },
    { char: 'C', sound: 'Cat' },
    { char: 'D', sound: 'Dog' },
  ],
  tracing: [
    { name: 'Trace Line', desc: '-----------------' },
    { name: 'Trace Circle', desc: 'o o o o o o' },
  ],
  stories: [
    { title: 'The Clever Crow', readTime: '2 min read' },
    { title: 'The Lion and The Mouse', readTime: '3 min read' },
  ],
};

export default function PrePrimaryScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'phonics' | 'tracing' | 'stories'>('phonics');

  const fetchContent = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/student/preprimary/content');
      setContent(res.data);
    } catch { setContent(FALLBACK_CONTENT); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchContent(); }, [fetchContent]);

  if (loading && !refreshing) return <LoadingState />;
  if (!content) return <ErrorState message="Failed to load content" onRetry={fetchContent} />;
  const c = content;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      {/* Sub tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'phonics', label: '🔊 Phonics' },
          { id: 'tracing', label: '✏️ Tracing' },
          { id: 'stories', label: '📖 Stories' }
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, activeTab === t.id && styles.activeTabBtn]}
            onPress={() => setActiveTab(t.id as any)}
          >
            <Text style={[styles.tabText, activeTab === t.id && styles.activeTabText]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Render selected sub-section */}
      {activeTab === 'phonics' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interactive Phonics Soundboard</Text>
          <Text style={styles.sectionDesc}>Tap a letter to play the phonic word sound.</Text>
          
            <View style={styles.grid}>
            {(c.phonics || []).length === 0 && <EmptyState message="No phonics content available." />}
            {(c.phonics || []).map((item: any) => (
              <TouchableOpacity key={item.char} style={styles.gridCard}>
                <Text style={styles.gridChar}>{item.char}</Text>
                <Text style={styles.gridWord}>{item.sound}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {activeTab === 'tracing' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Writing & Tracing Sandbox</Text>
          <Text style={styles.sectionDesc}>Follow the paths to practice handwriting.</Text>

          {(c.tracing || []).length === 0 && <EmptyState message="No tracing exercises available." />}
          {(c.tracing || []).map((item: any, idx: number) => (
            <View key={idx} style={styles.traceCard}>
              <Text style={styles.traceName}>{item.name}</Text>
              <Text style={styles.tracePattern}>{item.desc}</Text>
              <TouchableOpacity style={styles.traceBtn}>
                <Text style={styles.traceBtnText}>Start Tracing</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {activeTab === 'stories' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Read-Along Stories</Text>
          <Text style={styles.sectionDesc}>Read short stories with interactive voice synthesis.</Text>

          {(c.stories || []).length === 0 && <EmptyState message="No stories available." />}
          {(c.stories || []).map((story: any, idx: number) => (
            <View key={idx} style={styles.storyCard}>
              <View style={styles.storyDetails}>
                <Text style={styles.storyTitle}>{story.title}</Text>
                <Text style={styles.storyTime}>{story.readTime}</Text>
              </View>
              <TouchableOpacity style={styles.readBtn}>
                <Text style={styles.readBtnText}>▶ Read</Text>
              </TouchableOpacity>
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
  tabsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, marginHorizontal: 4, borderWidth: 1, borderColor: '#eee' },
  activeTabBtn: { backgroundColor: '#6200ee' },
  tabText: { fontSize: 13, color: '#666', fontWeight: 'bold' },
  activeTabText: { color: '#ffffff' },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  sectionDesc: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: '47%', backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  gridChar: { fontSize: 36, fontWeight: 'bold', color: '#6200ee' },
  gridWord: { fontSize: 14, color: '#555', marginTop: 4, fontWeight: '500' },
  traceCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  traceName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  tracePattern: { fontSize: 18, color: '#aaa', marginVertical: 12, letterSpacing: 2 },
  traceBtn: { backgroundColor: '#6200ee', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  traceBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  storyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  storyDetails: { flex: 1 },
  storyTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  storyTime: { fontSize: 11, color: '#666', marginTop: 2 },
  readBtn: { backgroundColor: '#f1f0fe', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  readBtnText: { color: '#6200ee', fontWeight: 'bold', fontSize: 12 }
});
