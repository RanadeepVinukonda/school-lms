import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

const MOCK_DETAIL = {
  name: 'Arjun S.',
  class: 'Grade 10A',
  mastery: 78,
  attendance: 94,
  avgGrade: 'B+',
  subjects: [
    { name: 'Mathematics', score: 82, color: '#6366f1' },
    { name: 'Physics', score: 71, color: '#ef4444' },
    { name: 'Chemistry', score: 88, color: '#10b981' },
    { name: 'English', score: 76, color: '#f59e0b' },
  ],
  recentGrades: [
    { subject: 'Mathematics', exam: 'Algebra Midterm', score: 85, date: '2026-06-20' },
    { subject: 'Physics', exam: 'Mechanics Quiz', score: 68, date: '2026-06-18' },
    { subject: 'Chemistry', exam: 'Periodic Table Test', score: 92, date: '2026-06-15' },
  ],
  attendanceLog: [
    { date: 'Mon', status: 'present' as const },
    { date: 'Tue', status: 'present' as const },
    { date: 'Wed', status: 'absent' as const },
    { date: 'Thu', status: 'present' as const },
    { date: 'Fri', status: 'present' as const },
  ],
};

export default function ChildDetailScreen({ route }: any) {
  const { childName } = route?.params ?? {};
  const data = MOCK_DETAIL;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{data.name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{data.name}</Text>
        <Text style={styles.class}>{data.class}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statVal}>{data.mastery}%</Text><Text style={styles.statLabel}>Mastery</Text></View>
        <View style={styles.statCard}><Text style={styles.statVal}>{data.attendance}%</Text><Text style={styles.statLabel}>Attendance</Text></View>
        <View style={styles.statCard}><Text style={styles.statVal}>{data.avgGrade}</Text><Text style={styles.statLabel}>Avg Grade</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Subject-wise Mastery</Text>
      {data.subjects.map((sub, i) => (
        <View key={i} style={styles.subjectRow}>
          <View style={[styles.subjectDot, { backgroundColor: sub.color }]} />
          <Text style={styles.subjectName}>{sub.name}</Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${sub.score}%`, backgroundColor: sub.color }]} />
          </View>
          <Text style={styles.subjectScore}>{sub.score}%</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Attendance This Week</Text>
      <View style={styles.attendanceRow}>
        {data.attendanceLog.map((day, i) => (
          <View key={i} style={styles.attendanceDay}>
            <Text style={styles.attendanceDate}>{day.date}</Text>
            <Text style={[styles.attendanceStatus, day.status === 'present' ? styles.present : styles.absent]}>
              {day.status === 'present' ? '✅' : '❌'}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Exam Grades</Text>
      {data.recentGrades.map((g, i) => (
        <View key={i} style={styles.gradeCard}>
          <View style={styles.gradeInfo}>
            <Text style={styles.gradeSubject}>{g.subject}</Text>
            <Text style={styles.gradeExam}>{g.exam}</Text>
            <Text style={styles.gradeDate}>{g.date}</Text>
          </View>
          <Text style={[styles.gradeScore, g.score >= 80 ? styles.gradeHigh : g.score >= 60 ? styles.gradeMed : styles.gradeLow]}>
            {g.score}%
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#6200ee', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#212121' },
  class: { fontSize: 13, color: '#666', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statVal: { fontSize: 20, fontWeight: 'bold', color: '#6200ee' },
  statLabel: { fontSize: 10, color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#212121', marginBottom: 12, marginTop: 12 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  subjectDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  subjectName: { width: 90, fontSize: 13, color: '#333' },
  progressBg: { flex: 1, height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  progressFill: { height: '100%' },
  subjectScore: { width: 36, textAlign: 'right', fontSize: 13, fontWeight: 'bold', color: '#333' },
  attendanceRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  attendanceDay: { alignItems: 'center' },
  attendanceDate: { fontSize: 12, color: '#666', marginBottom: 4 },
  attendanceStatus: { fontSize: 18 },
  present: {},
  absent: {},
  gradeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  gradeInfo: { flex: 1 },
  gradeSubject: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  gradeExam: { fontSize: 12, color: '#666', marginTop: 2 },
  gradeDate: { fontSize: 11, color: '#999', marginTop: 2 },
  gradeScore: { fontSize: 18, fontWeight: 'bold' },
  gradeHigh: { color: '#2e7d32' },
  gradeMed: { color: '#e65100' },
  gradeLow: { color: '#c62828' },
});
