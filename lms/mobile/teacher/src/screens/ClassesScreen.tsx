import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function ClassesScreen({ navigation }: any) {
  const classes = [
    { id: 'class-10a', name: 'Grade 10A', subject: 'Mathematics (MATH101)', strength: 32 },
    { id: 'class-10b', name: 'Grade 10B', subject: 'Physics (PHYS101)', strength: 28 },
    { id: 'class-9a', name: 'Grade 9A', subject: 'Mathematics (MATH90)', strength: 35 }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>My Assigned Classes</Text>
      <Text style={styles.sectionDesc}>Select a class to mark student attendance or view roster profiles.</Text>

      {classes.map((cls) => (
        <TouchableOpacity
          key={cls.id}
          style={styles.card}
          onClick={() => navigation.navigate('ClassAttendance', { classId: cls.id, className: cls.name })}
        >
          <View style={styles.classInfo}>
            <Text style={styles.className}>{cls.name}</Text>
            <Text style={styles.classSubject}>{cls.subject}</Text>
            <Text style={styles.classStrength}>👥 {cls.strength} Students</Text>
          </View>
          <Text style={styles.actionBtn}>Mark Attendance</Text>
        </TouchableOpacity>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Teacher Integration Tools</Text>

      <TouchableOpacity
        style={styles.specialCard}
        onClick={() => navigation.navigate('AssessmentCreate')}
      >
        <Text style={styles.icon}>📝</Text>
        <View style={styles.details}>
          <Text style={styles.specialTitle}>Create Assessment</Text>
          <Text style={styles.subtitle}>Configure questions and publish new assignments to classes.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.specialCard}
        onClick={() => navigation.navigate('ExamCorrection')}
      >
        <Text style={styles.icon}>🤖</Text>
        <View style={styles.details}>
          <Text style={styles.specialTitle}>AI Grading Review</Text>
          <Text style={styles.subtitle}>Review auto-generated AI score suggestions and adjust marks.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.specialCard}
        onClick={() => navigation.navigate('OCR')}
      >
        <Text style={styles.icon}>📷</Text>
        <View style={styles.details}>
          <Text style={styles.specialTitle}>Question Paper OCR Scanner</Text>
          <Text style={styles.subtitle}>Scan paper question sheets to extract text and populate quizzes.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.specialCard}
        onClick={() => navigation.navigate('Analytics')}
      >
        <Text style={styles.icon}>📊</Text>
        <View style={styles.details}>
          <Text style={styles.specialTitle}>Class Analytics</Text>
          <Text style={styles.subtitle}>View class performance, concept mastery, and assessment scores.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.specialCard}
        onClick={() => navigation.navigate('Textbooks')}
      >
        <Text style={styles.icon}>📚</Text>
        <View style={styles.details}>
          <Text style={styles.specialTitle}>Textbooks</Text>
          <Text style={styles.subtitle}>Browse and manage textbooks for your subjects.</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  sectionDesc: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  classInfo: { marginBottom: 12 },
  className: { fontSize: 16, fontWeight: 'bold', color: '#212121' },
  classSubject: { fontSize: 13, color: '#6200ee', fontWeight: '500', marginTop: 2 },
  classStrength: { fontSize: 11, color: '#666', marginTop: 6 },
  actionBtn: { alignSelf: 'flex-start', color: '#6200ee', fontWeight: 'bold', fontSize: 13, backgroundColor: '#f1f0fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  specialCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f0fe', borderLeftWidth: 4, borderLeftColor: '#6200ee', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  icon: { fontSize: 32, marginRight: 16 },
  details: { flex: 1 },
  specialTitle: { fontSize: 16, fontWeight: 'bold', color: '#6200ee' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 2 }
});
