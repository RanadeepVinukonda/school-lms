import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';

export default function AssessmentCreateScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('Assessment title is required');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      alert('Assessment created and published successfully!');
      navigation.goBack();
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Create New Assessment</Text>
      <Text style={styles.sectionDesc}>Configure assessment details to publish to students.</Text>

      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <label style={styles.label}>Assessment Title *</label>
          <TextInput
            style={styles.input}
            placeholder="e.g. Algebra Homework 3"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <label style={styles.label}>Description / Instructions</label>
          <TextInput
            multiline
            style={[styles.input, styles.textArea]}
            placeholder="Provide guidelines for the students..."
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.inputGroup}>
          <label style={styles.label}>Maximum Points *</label>
          <TextInput
            keyboardType="number-pad"
            style={styles.input}
            placeholder="100"
            value={maxScore}
            onChangeText={setMaxScore}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.disabledBtn]}
          disabled={submitting}
          onClick={handleSubmit}
        >
          <Text style={styles.btnText}>
            {submitting ? 'Creating assessment...' : 'Publish Assessment'}
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
  formCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, display: 'block' },
  input: { height: 44, borderBorderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, fontSize: 14, backgroundColor: '#fff' },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 10 },
  submitBtn: { backgroundColor: '#6200ee', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  disabledBtn: { backgroundColor: '#ccc' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 }
});
