import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';





export default function ReportsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<any>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);

  const fetchChildren = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/parent/children');
      setChildren(res.data);
    } catch (e) { console.warn('API call failed:', e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchChildren(); }, [fetchChildren]);

  const list = Array.isArray(children) ? children : (children?.children || []);
  const childName = list.find((c: any) => c.id === selectedChildId)?.name || null;

  const handleGenerate = async (childId: string) => {
    setSelectedChildId(childId);
    setGenerating(true);
    try {
      const res = await api.get(`/parent/reports/${childId}`);
      setReport(res.data);
    } catch (e) { console.warn('API call failed:', e instanceof Error ? e.message : String(e)); }
    finally { setGenerating(false); }
  };

  if (loading && !refreshing) return <LoadingState />;
  if (!children) return <ErrorState message="Failed to load children" onRetry={fetchChildren} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      <Text style={styles.title}>Reports & Recommendations</Text>
      <Text style={styles.subtitle}>AI-powered insights into your child's learning.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>✨ AI Weekly Report</Text>
        <Text style={styles.cardDesc}>Select a child to generate an AI-powered weekly progress report.</Text>

        <View style={styles.childPills}>
          {list.map((child: any) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.pill, selectedChildId === child.id && styles.activePill]}
              onPress={() => handleGenerate(child.id)}
            >
              <Text style={[styles.pillText, selectedChildId === child.id && styles.activePillText]}>
                {child.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {generating && (
          <View style={styles.generatingContainer}>
            <Text style={styles.generatingText}>⏳ Generating report...</Text>
          </View>
        )}

        {!generating && report && (
          <View style={styles.reportSection}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryName}>{childName}</Text>
              <Text style={styles.summaryText}>{report.summary}</Text>
            </View>

            {report.strengths.length > 0 && (
              <>
                <Text style={styles.reportLabel}>⭐ Strengths</Text>
                <View style={styles.tagRow}>
                  {report.strengths.map((s: any, i: number) => (
                    <View key={i} style={styles.successTag}><Text style={styles.successTagText}>{s}</Text></View>
                  ))}
                </View>
              </>
            )}

            {report.learningGaps.length > 0 && (
              <>
                <Text style={styles.reportLabel}>⚠️ Learning Gaps</Text>
                <View style={styles.tagRow}>
                  {report.learningGaps.map((g: any, i: number) => (
                    <View key={i} style={styles.warningTag}><Text style={styles.warningTagText}>{g}</Text></View>
                  ))}
                </View>
              </>
            )}

            {report.recommendations.length > 0 && (
              <>
                <Text style={styles.reportLabel}>💡 Recommendations</Text>
                {report.recommendations.map((rec: any, i: number) => (
                  <View key={i} style={styles.recRow}>
                    <Text style={[styles.recPriority, rec.priority === 'high' ? styles.highP : styles.medP]}>
                      {rec.priority === 'high' ? '!!' : '!'}
                    </Text>
                    <View style={styles.recContent}>
                      <Text style={styles.recArea}>{rec.area}</Text>
                      <Text style={styles.recSuggestion}>{rec.suggestion}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {report.weeklyOverview && (
              <View style={styles.overviewBox}>
                <Text style={styles.overviewLabel}>📅 Weekly Overview</Text>
                <Text style={styles.overviewText}>{report.weeklyOverview}</Text>
              </View>
            )}

            {report.nextSteps.length > 0 && (
              <>
                <Text style={styles.reportLabel}>📋 Next Steps</Text>
                {report.nextSteps.map((step: any, i: number) => (
                  <Text key={i} style={styles.stepItem}>{i + 1}. {step}</Text>
                ))}
              </>
            )}
          </View>
        )}

        {!generating && !report && (
          <Text style={styles.emptyText}>Select a child above to generate their report.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>✅ Recommendations Engine</Text>
        <Text style={styles.emptySubtext}>AI-powered recommendations appear once reports are generated.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#212121' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#212121', marginBottom: 8 },
  cardDesc: { fontSize: 12, color: '#666', marginBottom: 16 },
  childPills: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f0f0f0' },
  activePill: { backgroundColor: '#6200ee' },
  pillText: { fontSize: 13, color: '#666' },
  activePillText: { color: '#fff', fontWeight: 'bold' },
  generatingContainer: { alignItems: 'center', paddingVertical: 20 },
  generatingText: { fontSize: 14, color: '#6200ee' },
  reportSection: {},
  summaryBox: { backgroundColor: '#f1f0fe', borderRadius: 12, padding: 14, marginBottom: 16 },
  summaryName: { fontSize: 15, fontWeight: 'bold', color: '#6200ee', marginBottom: 4 },
  summaryText: { fontSize: 13, color: '#333' },
  reportLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8, marginTop: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  successTag: { backgroundColor: '#e8f5e9', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  successTagText: { fontSize: 12, color: '#2e7d32', fontWeight: '500' },
  warningTag: { backgroundColor: '#fff3e0', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  warningTagText: { fontSize: 12, color: '#e65100', fontWeight: '500' },
  recRow: { flexDirection: 'row', gap: 8, marginBottom: 8, padding: 8, backgroundColor: '#fafafa', borderRadius: 8 },
  recPriority: { fontSize: 14, fontWeight: 'bold' },
  highP: { color: '#c62828' },
  medP: { color: '#e65100' },
  recContent: { flex: 1 },
  recArea: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  recSuggestion: { fontSize: 12, color: '#666', marginTop: 2 },
  overviewBox: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginTop: 8 },
  overviewLabel: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  overviewText: { fontSize: 12, color: '#666' },
  stepItem: { fontSize: 13, color: '#666', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 20 },
  emptySubtext: { fontSize: 12, color: '#999', textAlign: 'center', paddingVertical: 10 },
});
