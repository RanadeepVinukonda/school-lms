import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';

export default function CodingScreen() {
  const [code, setCode] = useState(`def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Genesis Coder"))`);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const runCode = () => {
    setRunning(true);
    setTimeout(() => {
      setOutput('>>> Hello, Genesis Coder!');
      setRunning(false);
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Python Coding Playground</Text>
      <Text style={styles.subtitle}>Write and run Python scripts directly on your device.</Text>

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
          onClick={runCode}
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
  consoleCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderBorderWidth: 1, borderColor: '#eee' },
  consoleText: { fontFamily: 'monospace', fontSize: 13, color: '#333' }
});
