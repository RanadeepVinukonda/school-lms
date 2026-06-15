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
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

interface SchoolOverview {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  activeUsers: number;
}

export default function AdminDashboardScreen() {
  const [overview, setOverview] = useState<SchoolOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      setError(null);
      const res = await api.get('/admin/dashboard/overview');
      setOverview(res.data.data);
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
    return <LoadingSpinner message="Loading admin dashboard..." />;
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
        <Text style={styles.title}>School Overview</Text>

        {overview && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
              <Text style={styles.statValue}>{overview.totalStudents}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
              <Text style={styles.statValue}>{overview.totalTeachers}</Text>
              <Text style={styles.statLabel}>Teachers</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
              <Text style={styles.statValue}>{overview.totalClasses}</Text>
              <Text style={styles.statLabel}>Classes</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FDF2F8' }]}>
              <Text style={styles.statValue}>{overview.totalSubjects}</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Links</Text>
        <View style={styles.linksList}>
          <TouchableOpacity style={styles.linkItem} activeOpacity={0.7}>
            <Text style={styles.linkText}>Manage Students</Text>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem} activeOpacity={0.7}>
            <Text style={styles.linkText}>Manage Teachers</Text>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem} activeOpacity={0.7}>
            <Text style={styles.linkText}>Manage Classes</Text>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem} activeOpacity={0.7}>
            <Text style={styles.linkText}>Manage Subjects</Text>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem} activeOpacity={0.7}>
            <Text style={styles.linkText}>School Analytics</Text>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem} activeOpacity={0.7}>
            <Text style={styles.linkText}>Settings</Text>
            <Text style={styles.linkArrow}>→</Text>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  linksList: {
    gap: 8,
  },
  linkItem: {
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
  linkText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  linkArrow: {
    fontSize: 18,
    color: '#9CA3AF',
  },
});
