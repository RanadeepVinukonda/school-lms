import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';

interface Subject {
  id: string; title: string; subtitle: string; code: string;
}

export default function SubjectsScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/student/subjects');
      setSubjects(res.data?.data ?? []);
    } catch {
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  if (loading && !refreshing) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Curriculum Subjects</Text>
      </View>

      {subjects.length === 0 && !loading ? (
        <EmptyState message="No subjects available yet." />
      ) : (
        subjects.map((sub) => (
          <TouchableOpacity
            key={sub.id}
            style={styles.card}
            onPress={() => navigation.navigate('SubjectDetail', { subjectId: sub.id, subjectTitle: sub.title })}
          >
            <MaterialCommunityIcons name="book-open-variant" size={32} color="#6200ee" style={styles.icon} />
            <View style={styles.details}>
              <Text style={styles.title}>{sub.title}</Text>
              <Text style={styles.subtitle}>{sub.subtitle}</Text>
              <Text style={styles.code}>{sub.code}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Interactive Learning Playgrounds</Text>
      </View>

      <TouchableOpacity
        style={styles.specialCard}
        onPress={() => navigation.navigate('Labs', { labId: 'chem-lab' })}
      >
        <MaterialCommunityIcons name="dna" size={32} color="#6200ee" style={styles.icon} />
        <View style={styles.details}>
          <Text style={styles.specialTitle}>Virtual Science Labs</Text>
          <Text style={styles.subtitle}>Run interactive 3D simulations of lab chemistry and physics experiments.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.specialCard}
        onPress={() => navigation.navigate('Coding', { exerciseId: 'python-intro' })}
      >
        <MaterialCommunityIcons name="code-tags" size={32} color="#6200ee" style={styles.icon} />
        <View style={styles.details}>
          <Text style={styles.specialTitle}>Coding Editor Sandbox</Text>
          <Text style={styles.subtitle}>Write, execute and test real Python, HTML, and JS code.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.specialCard}
        onPress={() => navigation.navigate('PrePrimary', { ageGroup: 'k2' })}
      >
        <MaterialCommunityIcons name="palette" size={32} color="#6200ee" style={styles.icon} />
        <View style={styles.details}>
          <Text style={styles.specialTitle}>K2 Early Learning Hub</Text>
          <Text style={styles.subtitle}>Pre-primary tracing, phonics, soundboards, and children stories.</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  sectionHeader: { marginBottom: 12, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  specialCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f0fe', borderLeftWidth: 4, borderLeftColor: '#6200ee', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  icon: { fontSize: 32, marginRight: 16 },
  details: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#212121' },
  specialTitle: { fontSize: 16, fontWeight: 'bold', color: '#6200ee' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  code: { fontSize: 11, fontWeight: 'bold', color: '#999', marginTop: 4 },
  arrow: { fontSize: 24, color: '#ccc', fontWeight: '300' }
});
