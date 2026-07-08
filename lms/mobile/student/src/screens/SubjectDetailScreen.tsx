import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';



export default function SubjectDetailScreen({ route, navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<any>(null);
  const { subjectTitle, subjectId } = route.params || { subjectTitle: 'Mathematics' };
  const [activeChapter, setActiveChapter] = useState<number | null>(null);

  const fetchChapters = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const endpoint = subjectId ? `/subjects/${subjectId}/chapters` : '/subjects/chapters';
      const res = await api.get(endpoint);
      setChapters(res.data);
    } catch (e) { console.warn('API call failed:', e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [subjectId]);

  useEffect(() => { fetchChapters(); }, [fetchChapters]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchChapters(); }, [fetchChapters]);

  if (loading && !refreshing) return <LoadingState />;
  if (!chapters) return <ErrorState message="Failed to load chapters" onRetry={fetchChapters} />;
  const list = Array.isArray(chapters) ? chapters : (chapters?.chapters || []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      <View style={styles.header}>
        <Text style={styles.title}>{subjectTitle}</Text>
        <Text style={styles.subtitle}>Tap a chapter to inspect lessons and test your knowledge.</Text>
      </View>

      {/* Chapters list */}
      {list.length === 0 && <EmptyState message="No chapters available for this subject." />}
      {list.map((ch: any) => (
        <View key={ch.id} style={styles.chapterWrapper}>
          <TouchableOpacity
            style={styles.chapterHeader}
            onPress={() => setActiveChapter(activeChapter === ch.id ? null : ch.id)}
          >
            <Text style={styles.chapterTitle}>{ch.title}</Text>
            <Text style={styles.toggleIcon}>{activeChapter === ch.id ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {activeChapter === ch.id && (
            <View style={styles.lessonList}>
              {ch.lessons.map((les: any, idx: number) => (
                <View key={idx} style={styles.lessonItem}>
                  <Text style={styles.lessonBullet}>•</Text>
                  <Text style={styles.lessonName}>{les}</Text>
                </View>
              ))}

              {/* Quiz Launch */}
              <TouchableOpacity
                style={styles.quizBtn}
                onPress={() => navigation.navigate('Quiz', { chapterId: ch.id, chapterTitle: ch.title })}
              >
                <Text style={styles.quizBtnText}>⚡ Take Adaptive Quiz</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#212121' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  chapterWrapper: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  chapterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  chapterTitle: { fontSize: 15, fontWeight: 'bold', color: '#212121' },
  toggleIcon: { fontSize: 12, color: '#999' },
  lessonList: { padding: 16, backgroundColor: '#fafafa', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  lessonItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  lessonBullet: { color: '#6200ee', fontWeight: 'bold', marginRight: 8, fontSize: 16 },
  lessonName: { fontSize: 13, color: '#333' },
  quizBtn: { marginTop: 12, backgroundColor: '#6200ee', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  quizBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 }
});
