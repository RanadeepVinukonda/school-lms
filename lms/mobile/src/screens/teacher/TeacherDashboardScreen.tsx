import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

interface NeedsAttention {
  awaitingGrading: number;
  needCorrection: number;
  lateSubmissions: number;
}

interface ClassMetrics {
  totalStudents: number;
  averageGrade: number;
  passRate: number;
}

export default function TeacherDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const [attention, setAttention] = useState<NeedsAttention | null>(null);
  const [metrics, setMetrics] = useState<ClassMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      setError(null);
      const [attentionRes, metricsRes] = await Promise.all([
        api.get('/teacher/dashboard/needs-attention'),
        api.get('/teacher/dashboard/class-metrics'),
      ]);
      setAttention(attentionRes.data.data);
      setMetrics(metricsRes.data.data);
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

  if (error && !attention) {
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
        <Text style={styles.greeting}>Welcome, {user?.displayName?.split(' ')[0] || 'Teacher'}</Text>

        <Text style={styles.sectionTitle}>Needs Attention</Text>
        {attention && (
          <View style={styles.attentionRow}>
            <View style={[styles.attentionCard, styles.cardGrading]}>
              <Text style={styles.attentionValue}>{attention.awaitingGrading}</Text>
              <Text style={styles.attentionLabel}>Awaiting Grading</Text>
            </View>
            <View style={[styles.attentionCard, styles.cardCorrection]}>
              <Text style={styles.attentionValue}>{attention.needCorrection}</Text>
              <Text style={styles.attentionLabel}>Need Correction</Text>
            </View>
            <View style={[styles.attentionCard, styles.cardLate]}>
              <Text style={styles.attentionValue}>{attention.lateSubmissions}</Text>
              <Text style={styles.attentionLabel}>Late Submissions</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Class Metrics</Text>
        {metrics && (
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.totalStudents}</Text>
              <Text style={styles.metricLabel}>Students</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.averageGrade.toFixed(0)}%</Text>
              <Text style={styles.metricLabel}>Avg Grade</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.passRate.toFixed(0)}%</Text>
              <Text style={styles.metricLabel}>Pass Rate</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsList}>
          <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
            <Text style={styles.actionText}>Create Exam</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
            <Text style={styles.actionText}>Review Submissions</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
            <Text style={styles.actionText}>View Analytics</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginTop: 4,
  },
  attentionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  attentionCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  cardGrading: {
    backgroundColor: '#FEF3C7',
  },
  cardCorrection: {
    backgroundColor: '#FEE2E2',
  },
  cardLate: {
    backgroundColor: '#FFEDD5',
  },
  attentionValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  attentionLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4F46E5',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actionsList: {
    gap: 8,
  },
  actionItem: {
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
  actionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  actionArrow: {
    fontSize: 18,
    color: '#9CA3AF',
  },
});
