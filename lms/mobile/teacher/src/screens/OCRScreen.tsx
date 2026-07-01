import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function OCRScreen() {
  const [scanning, setScanning] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);

  const startOcrCapture = () => {
    setScanning(true);
    setTimeout(() => {
      setQuestions(prev => [
        ...prev,
        '1. Solve the quadratic equation x^2 - 5x + 6 = 0',
        '2. Define Newton\'s third law of motion with equations'
      ]);
      setScanning(false);
    }, 2000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Question Paper OCR Scanner</Text>
      <Text style={styles.sectionDesc}>Capture photos of physical question papers to instantly digitize them and auto-populate quizzes.</Text>

      <View style={styles.card}>
        <Text style={styles.instruction}>
          Hold your device steady and ensure that all text is clearly visible within the frame.
        </Text>

        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.disabledBtn]}
          disabled={scanning}
          onClick={startOcrCapture}
        >
          <Text style={styles.btnText}>
            {scanning ? 'Extracting text (OCR)...' : '📷 Capture & Scan Document'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Captured Output */}
      {questions.length > 0 && (
        <View style={styles.capturedArea}>
          <Text style={styles.capturedTitle}>Extracted Questions ({questions.length})</Text>
          {questions.map((q, idx) => (
            <View key={idx} style={styles.questionCard}>
              <Text style={styles.questionText}>{q}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  sectionDesc: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  instruction: { fontSize: 12, color: '#666', marginBottom: 16, lineHeight: 18 },
  scanBtn: { backgroundColor: '#6200ee', padding: 14, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#ccc' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  capturedArea: { marginTop: 12 },
  capturedTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  questionCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 8, borderBorderWidth: 1, borderColor: '#eee' },
  questionText: { fontSize: 13, color: '#212121', lineHeight: 18 }
});
