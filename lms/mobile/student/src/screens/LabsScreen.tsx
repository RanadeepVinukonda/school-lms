import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';

const FALLBACK_LAB = { title: 'Water Molecule Boiling Point Lab', description: 'Adjust temperature and observe molecule state change simulation.', initialTemp: 25 };

export default function LabsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lab, setLab] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [temperature, setTemperature] = useState(25);

  const fetchLab = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/student/labs');
      const d = Array.isArray(res.data) ? res.data[0] : res.data;
      setLab(d);
      if (d?.initialTemp) setTemperature(d.initialTemp);
    } catch { setLab(FALLBACK_LAB); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchLab(); }, [fetchLab]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchLab(); }, [fetchLab]);

  if (loading && !refreshing) return <LoadingState />;
  if (!lab) return <ErrorState message="Failed to load lab" onRetry={fetchLab} />;

  const startSimulation = () => {
    setRunning(true);
  };

  const stopSimulation = () => {
    setRunning(false);
    setTemperature(25);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
      <Text style={styles.title}>{lab.title}</Text>
      <Text style={styles.subtitle}>{lab.description}</Text>

      <View style={styles.screenCard}>
        {/* Simulation Output Area */}
        <View style={styles.simulationScreen}>
          {running ? (
            <View style={styles.simDetails}>
              <Text style={styles.moleculeState}>
                {temperature >= 100 ? '💨 GAS STATE (Steam)' : '💧 LIQUID STATE (Water)'}
              </Text>
              <Text style={styles.simStats}>Temp: {temperature}°C</Text>
              <Text style={styles.molecules}>o .  o  .  o  .  o .  o</Text>
            </View>
          ) : (
            <Text style={styles.idleText}>Lab Simulation Standby</Text>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          {!running ? (
            <TouchableOpacity style={styles.startBtn} onPress={startSimulation}>
              <Text style={styles.btnText}>Start Experiment</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeControls}>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => setTemperature(prev => prev + 25)}
              >
                <Text style={styles.btnText}>🔥 Heat (+25°C)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopBtn} onPress={stopSimulation}>
                <Text style={styles.btnText}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 20 },
  screenCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  simulationScreen: { height: 180, backgroundColor: '#212121', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  idleText: { color: '#888', fontStyle: 'italic' },
  simDetails: { alignItems: 'center' },
  moleculeState: { color: '#00e5ff', fontSize: 18, fontWeight: 'bold' },
  simStats: { color: '#ffffff', fontSize: 14, marginTop: 8 },
  molecules: { color: '#aaa', fontSize: 18, marginTop: 12, letterSpacing: 4 },
  controlsRow: { alignItems: 'center' },
  startBtn: { backgroundColor: '#6200ee', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  stopBtn: { backgroundColor: '#ff1744', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  activeControls: { flexDirection: 'row', gap: 12 },
  controlBtn: { backgroundColor: '#4caf50', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 }
});
