import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

interface Exam {
  id: string;
  title: string;
  subject: string;
  date: string;
  duration: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  grade?: number;
  maxGrade?: number;
}

export default function StudentExamsScreen() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchExams() {
    try {
      setError(null);
      const res = await api.get('/student/exams');
      setExams(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exams');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchExams();
    }, []),
  );

  function onRefresh() {
    setRefreshing(true);
    fetchExams();
  }

  function getStatusStyle(status: Exam['status']) {
    switch (status) {
      case 'upcoming':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'ongoing':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'completed':
        return { bg: '#D1FAE5', text: '#065F46' };
    }
  }

  function getStatusLabel(status: Exam['status']) {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'ongoing': return 'Ongoing';
      case 'completed': return 'Completed';
    }
  }

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading exams..." />;
  }

  if (error && exams.length === 0) {
    return <ErrorMessage message={error} onRetry={fetchExams} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={exams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No exams found</Text>
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);
          return (
            <View style={styles.examItem}>
              <View style={styles.examHeader}>
                <Text style={styles.examTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.examSubject}>{item.subject}</Text>
              <View style={styles.examFooter}>
                <Text style={styles.examMeta}>
                  {new Date(item.date).toLocaleDateString()} · {item.duration} min
                </Text>
                {item.status === 'completed' && item.grade !== undefined && (
                  <Text style={styles.grade}>
                    {item.grade}/{item.maxGrade}
                  </Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  examItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  examSubject: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  examFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examMeta: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  grade: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 40,
  },
});
