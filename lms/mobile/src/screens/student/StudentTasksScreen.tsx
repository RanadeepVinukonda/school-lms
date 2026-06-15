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

interface Task {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  grade?: number;
  maxGrade?: number;
}

export default function StudentTasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTasks() {
    try {
      setError(null);
      const res = await api.get('/student/tasks');
      setTasks(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTasks();
    }, []),
  );

  function onRefresh() {
    setRefreshing(true);
    fetchTasks();
  }

  function getStatusStyle(status: Task['status']) {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'submitted':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'graded':
        return { bg: '#D1FAE5', text: '#065F46' };
    }
  }

  function getStatusLabel(status: Task['status']) {
    switch (status) {
      case 'pending': return 'Pending';
      case 'submitted': return 'Submitted';
      case 'graded': return 'Graded';
    }
  }

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading tasks..." />;
  }

  if (error && tasks.length === 0) {
    return <ErrorMessage message={error} onRetry={fetchTasks} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tasks found</Text>
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);
          return (
            <View style={styles.taskItem}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.taskSubject}>{item.subject}</Text>
              <View style={styles.taskFooter}>
                <Text style={styles.dueDate}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
                {item.status === 'graded' && item.grade !== undefined && (
                  <Text style={styles.grade}>
                    Grade: {item.grade}/{item.maxGrade}
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
  taskItem: {
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
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: {
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
  taskSubject: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDate: {
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
