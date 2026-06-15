import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

interface OverviewData {
  subjectsCount: number;
  averageGrade: number;
  completedAssessments: number;
  className: string;
}

interface RecentResult {
  id: string;
  title: string;
  type: 'exam' | 'assignment' | 'quiz';
  grade: number;
  maxGrade: number;
  submittedAt: string;
}

export default function StudentDashboardScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [results, setResults] = useState<RecentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      setError(null);
      const [overviewRes, resultsRes] = await Promise.all([
        api.get('/student/dashboard/overview'),
        api.get('/student/dashboard/recent-results'),
      ]);
      setOverview(overviewRes.data.data);
      setResults(resultsRes.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, []),
  );

  function onRefresh() {
    setRefreshing(true);
    fetchData();
  }

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error && !overview) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        <Text style={styles.greeting}>Welcome, {user?.displayName?.split(' ')[0] || 'Student'}</Text>

        {overview && (
          <View style={styles.cardsRow}>
            <View style={[styles.card, styles.cardSubjects]}>
              <Text style={styles.cardValue}>{overview.subjectsCount}</Text>
              <Text style={styles.cardLabel}>Subjects</Text>
            </View>
            <View style={[styles.card, styles.cardGrade]}>
              <Text style={styles.cardValue}>{overview.averageGrade.toFixed(0)}%</Text>
              <Text style={styles.cardLabel}>Avg Grade</Text>
            </View>
            <View style={[styles.card, styles.cardAssessments]}>
              <Text style={styles.cardValue}>{overview.completedAssessments}</Text>
              <Text style={styles.cardLabel}>Completed</Text>
            </View>
          </View>
        )}

        {overview?.className && (
          <View style={styles.classBadge}>
            <Text style={styles.classBadgeText}>Class: {overview.className}</Text>
          </View>
        )}

        <View style={styles.quickLinks}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('StudentTasks')}
            activeOpacity={0.7}
          >
            <Text style={styles.quickLinkIcon}>Tasks</Text>
            <Text style={styles.quickLinkArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('StudentExams')}
            activeOpacity={0.7}
          >
            <Text style={styles.quickLinkIcon}>Exams</Text>
            <Text style={styles.quickLinkArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Results</Text>
        {results.length === 0 ? (
          <Text style={styles.emptyText}>No results yet</Text>
        ) : (
          results.map((item) => (
            <View key={item.id} style={styles.resultItem}>
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.resultType}>{item.type}</Text>
              </View>
              <View style={styles.resultGrade}>
                <Text style={[styles.gradeText, { color: item.grade / item.maxGrade >= 0.5 ? '#059669' : '#DC2626' }]}>
                  {item.grade}/{item.maxGrade}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cardSubjects: {
    backgroundColor: '#EEF2FF',
  },
  cardGrade: {
    backgroundColor: '#ECFDF5',
  },
  cardAssessments: {
    backgroundColor: '#FFF7ED',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  cardLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  classBadge: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  classBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  quickLink: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickLinkIcon: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  quickLinkArrow: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  resultItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultInfo: {
    flex: 1,
    marginRight: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  resultType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  resultGrade: {
    alignItems: 'flex-end',
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
  },
});
