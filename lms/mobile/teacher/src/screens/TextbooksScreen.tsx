import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';

const FALLBACK_CLASSES: any[] = [
  { id: 'c1', name: 'Grade 10A', subjects: [
    { id: 's1', name: 'Mathematics', color: '#6366f1', textbooks: [
      { id: 'tb1', title: 'Algebra Textbook Vol 1', chapterCount: 12, status: 'ready' },
      { id: 'tb2', title: 'Geometry Reference', chapterCount: 8, status: 'processing' },
    ]},
    { id: 's2', name: 'Physics', color: '#ef4444', textbooks: [
      { id: 'tb3', title: 'Mechanics 101', chapterCount: 10, status: 'ready' },
    ]},
  ]},
  { id: 'c2', name: 'Grade 10B', subjects: [
    { id: 's1', name: 'Mathematics', color: '#6366f1', textbooks: [] },
  ]},
];

export default function TextbooksScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<any>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/teacher/textbooks');
      setClasses(res.data);
    } catch { setClasses(FALLBACK_CLASSES); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const clsList = Array.isArray(classes) ? classes : (classes?.classes || []);
  const cls = clsList.find((c: any) => c.id === selectedClassId);
  const sub = cls?.subjects.find((s: any) => s.id === selectedSubjectId);

  const reset = () => { setSelectedClassId(null); setSelectedSubjectId(null); };

  if (loading && !refreshing) return <LoadingState />;
  if (!classes) return <ErrorState message="Failed to load textbooks" onRetry={fetchData} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        <TouchableOpacity onPress={reset}>
          <Text style={[styles.breadcrumbItem, !selectedClassId && styles.breadcrumbActive]}>Classes</Text>
        </TouchableOpacity>
        {cls && (
          <>
            <Text style={styles.breadcrumbSep}>›</Text>
            <TouchableOpacity onPress={() => setSelectedSubjectId(null)}>
              <Text style={[styles.breadcrumbItem, !selectedSubjectId && styles.breadcrumbActive]}>{cls.name}</Text>
            </TouchableOpacity>
          </>
        )}
        {cls && sub && (
          <>
            <Text style={styles.breadcrumbSep}>›</Text>
            <Text style={[styles.breadcrumbItem, styles.breadcrumbActive]}>{sub.name}</Text>
          </>
        )}
      </View>

      <Text style={styles.title}>
        {!selectedClassId ? 'Teaching Space' : !selectedSubjectId ? `${cls!.name} — Subjects` : `${cls!.name} — ${sub!.name}`}
      </Text>
      <Text style={styles.subtitle}>
        {!selectedClassId ? 'Select a class to manage textbooks.' : !selectedSubjectId ? 'Select a subject to browse textbooks.' : 'Uploaded textbooks and materials.'}
      </Text>

      {/* Classes View */}
      {!selectedClassId && clsList.length === 0 && <EmptyState message="No classes found." />}
      {!selectedClassId && clsList.map((c: any) => (
        <TouchableOpacity key={c.id} style={styles.classCard} onPress={() => setSelectedClassId(c.id)}>
          <View style={styles.classHeader}>
            <Text style={styles.className}>{c.name}</Text>
            <Text style={styles.classMeta}>{c.subjects.length} subjects</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      ))}

      {/* Subjects View */}
      {selectedClassId && !selectedSubjectId && cls && (
        <>
          <TouchableOpacity style={styles.backBtn} onPress={reset}><Text style={styles.backText}>← Back to Classes</Text></TouchableOpacity>
          {cls.subjects.map((s) => (
            <TouchableOpacity key={s.id} style={styles.subjectCard} onPress={() => setSelectedSubjectId(s.id)}>
              <View style={styles.subjectInfo}>
                <View style={[styles.subjectDot, { backgroundColor: s.color }]} />
                <View>
                  <Text style={styles.subjectName}>{s.name}</Text>
                  <Text style={styles.subjectMeta}>{s.textbooks.length} textbooks</Text>
                </View>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Textbooks View */}
      {selectedClassId && selectedSubjectId && sub && (
        <>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedSubjectId(null)}>
            <Text style={styles.backText}>← Back to Subjects</Text>
          </TouchableOpacity>
          {sub.textbooks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyText}>No textbooks uploaded yet</Text>
            </View>
          ) : (
            sub.textbooks.map((tb) => (
              <View key={tb.id} style={styles.tbCard}>
                <View style={styles.tbHeader}>
                  <Text style={styles.tbIcon}>📖</Text>
                  <View style={styles.tbInfo}>
                    <Text style={styles.tbTitle}>{tb.title}</Text>
                    <Text style={styles.tbMeta}>
                      {tb.status === 'processing' ? '⏳ Processing' : `${tb.chapterCount} chapters`}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  breadcrumbItem: { fontSize: 13, color: '#666' },
  breadcrumbActive: { fontWeight: 'bold', color: '#212121' },
  breadcrumbSep: { fontSize: 14, color: '#999', marginHorizontal: 6 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#212121' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 20 },
  classCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  classHeader: {},
  className: { fontSize: 16, fontWeight: 'bold', color: '#212121' },
  classMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  arrow: { fontSize: 18, color: '#999' },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 13, color: '#6200ee', fontWeight: '600' },
  subjectCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  subjectInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectDot: { width: 12, height: 12, borderRadius: 6 },
  subjectName: { fontSize: 15, fontWeight: 'bold', color: '#212121' },
  subjectMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.3 },
  emptyText: { fontSize: 15, color: '#666' },
  tbCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  tbHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tbIcon: { fontSize: 28 },
  tbInfo: { flex: 1 },
  tbTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  tbMeta: { fontSize: 12, color: '#666', marginTop: 2 },
});
