import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';

export default function ExamCorrectionScreen({ navigation }: any) {
  const [adjustedScore, setAdjustedScore] = useState('8');
  const [saving, setSaving] = useState(false);

  const saveGrade = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('Grade finalized and pushed back successfully!');
      navigation.goBack();
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>AI Grading Correction Hub</Text>
      <Text style={styles.sectionDesc}>Review AI auto-generated grading and adjust scores manually.</Text>

      {/* Answer Metadata */}
      <View style={styles.card}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Student:</Text>
          <Text style={styles.metaVal}>Aarav Sharma</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Coursework:</Text>
          <Text style={styles.metaVal}>Physics Mechanics Essay</Text>
        </View>
      </View>

      {/* Prompt and Student Answer */}
      <View style={styles.card}>
        <Text style={styles.questionLabel}>Question Prompt</Text>
        <Text style={styles.promptText}>
          Explain Newton's Second Law of Motion and give a real-life example.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.questionLabel}>Student Answer Submission</Text>
        <Text style={styles.studentAnswer}>
          "Newton's second law says that force equals mass times acceleration (F=ma). An example is pushing a heavy shopping cart compared to an empty shopping cart. The empty cart accelerates faster because it has less mass."
        </Text>
      </View>

      {/* AI Grading & Correction Panel */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>AI Automated Assessment</Text>
        <View style={styles.aiReviewBox}>
          <Text style={styles.aiGrade}>Suggested: 8 / 10 Points</Text>
          <Text style={styles.aiConfidence}>Confidence: 94% Accuracy</Text>
        </View>
        <Text style={styles.aiExplanation}>
          Explanation: The student stated the correct formula (F=ma) and provided a valid physics-based real-life shopping cart example.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.questionLabel}>Teacher Score Adjustment</Text>
        <View style={styles.adjustRow}>
          <TextInput
            keyboardType="number-pad"
            style={styles.scoreInput}
            value={adjustedScore}
            onChangeText={setAdjustedScore}
          />
          <Text style={styles.maxText}>/ 10 Points</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabledBtn]}
          disabled={saving}
          onClick={saveGrade}
        >
          <Text style={styles.btnText}>
            {saving ? 'Saving final score...' : 'Finalize & Post Grade'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  sectionDesc: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { fontSize: 13, color: '#666' },
  metaVal: { fontSize: 13, fontWeight: '600', color: '#212121' },
  questionLabel: { fontSize: 11, fontWeight: 'bold', color: '#6200ee', uppercase: true, trackingWith: 1, marginBottom: 8 },
  promptText: { fontSize: 14, fontWeight: '600', color: '#212121', lineHeight: 20 },
  studentAnswer: { fontSize: 13, color: '#444', fontStyle: 'italic', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  aiReviewBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f0fe', padding: 12, borderRadius: 8, marginBottom: 8 },
  aiGrade: { fontSize: 14, fontWeight: 'bold', color: '#6200ee' },
  aiConfidence: { fontSize: 11, color: '#4caf50', fontWeight: 'bold' },
  aiExplanation: { fontSize: 12, color: '#666', lineHeight: 18 },
  adjustRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  scoreInput: { width: 60, height: 44, borderBorderWidth: 1, borderColor: '#ccc', borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#212121', backgroundColor: '#fff' },
  maxText: { fontSize: 14, color: '#666', marginLeft: 8 },
  saveBtn: { backgroundColor: '#6200ee', padding: 16, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#ccc' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 }
});
