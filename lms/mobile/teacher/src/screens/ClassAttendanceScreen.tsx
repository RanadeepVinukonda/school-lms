import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function ClassAttendanceScreen({ route, navigation }: any) {
  const { className } = route.params || { className: 'Grade 10A' };

  // Student roster status
  const [students, setStudents] = useState([
    { id: '1', name: 'Aarav Sharma', present: true },
    { id: '2', name: 'Ananya Iyer', present: true },
    { id: '3', name: 'Kabir Mehta', present: false },
    { id: '4', name: 'Meera Deshmukh', present: true }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const toggleStatus = (id: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, present: !s.present } : s));
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, present: true })));
  };

  const submitAttendance = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      alert('Attendance saved successfully!');
      navigation.goBack();
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{className} Attendance Roster</Text>
          <Text style={styles.dateLabel}>Date: {new Date().toLocaleDateString()}</Text>
        </View>

        <TouchableOpacity style={styles.allBtn} onClick={markAllPresent}>
          <Text style={styles.allBtnText}>✓ Mark All Present</Text>
        </TouchableOpacity>

        {students.map((student) => (
          <View key={student.id} style={styles.studentRow}>
            <Text style={styles.studentName}>{student.name}</Text>
            <TouchableOpacity
              style={[
                styles.statusBadge,
                student.present ? styles.presentBadge : styles.absentBadge
              ]}
              onClick={() => toggleStatus(student.id)}
            >
              <Text style={student.present ? styles.presentText : styles.absentText}>
                {student.present ? 'Present' : 'Absent'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.disabledBtn]}
          disabled={submitting}
          onClick={submitAttendance}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? 'Saving attendance...' : 'Save Attendance'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  dateLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  allBtn: { alignSelf: 'flex-start', marginVertical: 12, backgroundColor: '#f1f0fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  allBtnText: { color: '#6200ee', fontWeight: 'bold', fontSize: 12 },
  studentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8 },
  studentName: { fontSize: 14, fontWeight: '500', color: '#333' },
  statusBadge: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 12 },
  presentBadge: { backgroundColor: '#e8f5e9' },
  absentBadge: { backgroundColor: '#ffebee' },
  presentText: { color: '#4caf50', fontWeight: 'bold', fontSize: 12 },
  absentText: { color: '#ff1744', fontWeight: 'bold', fontSize: 12 },
  submitBtn: { backgroundColor: '#6200ee', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  disabledBtn: { backgroundColor: '#ccc' },
  submitBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 }
});
