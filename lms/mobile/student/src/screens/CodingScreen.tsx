import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';



export default function CodingScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<any>(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const fetchChallenge = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/student/coding/challenges');
      const d = Array.isArray(res.data) ? res.data[0] : (res.data || null);
      setChallenge(d);
      setCode(d?.starterCode || '');
    } catch (e) { console.warn('Failed to load challenge:', e instanceof Error ? e.message : String(e)); setError('Could not load coding challenge.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchChallenge(); }, [fetchChallenge]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchChallenge(); }, [fetchChallenge]);

  if (loading && !refreshing) return <LoadingState />;
  if (!challenge) return <ErrorState message="Failed to load challenge" onRetry={fetchChallenge} />;

  const runCode = () => {
    setRunning(true);
    setTimeout(() => {
      setOutput('>>> Hello, Genesis Coder!');
      setRunning(false);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      <Text style={styles.title}>{challenge.title}</Text>
      <Text style={styles.subtitle}>{challenge.description}</Text>

      <View style={styles.card}>
        <TextInput
          multiline
          style={styles.codeEditor}
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.runBtn, running && styles.disabledBtn]}
          disabled={running}
          onPress={runCode}
        >
          <Text style={styles.btnText}>
            {running ? 'Executing script...' : '⚡ Run Code'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Console Output</Text>
      <View style={styles.consoleCard}>
        <Text style={styles.consoleText}>
          {output || 'Console idle. Click Run Code to execute script.'}
        </Text>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 20 },
  card: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 12, marginBottom: 20 },
  codeEditor: { height: 180, color: '#00ff00', fontFamily: 'monospace', fontSize: 13, textAlignVertical: 'top', padding: 8 },
  runBtn: { backgroundColor: '#6200ee', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  disabledBtn: { backgroundColor: '#444' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#212121', marginBottom: 12 },
  consoleCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eee' },
  consoleText: { fontFamily: 'monospace', fontSize: 13, color: '#333' }
});
