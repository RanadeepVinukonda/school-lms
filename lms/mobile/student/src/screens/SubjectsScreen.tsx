import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function SubjectsScreen({ navigation }: any) {
  const subjects = [
    { id: 'math', title: 'Mathematics', subtitle: 'Algebra, Geometry & Calculus', code: 'MATH101', icon: '📐' },
    { id: 'physics', title: 'Physics', subtitle: 'Mechanics, Optics & Thermodynamics', code: 'PHYS101', icon: '⚛️' },
    { id: 'chemistry', title: 'Chemistry', subtitle: 'Organic, Inorganic & Lab Science', code: 'CHEM101', icon: '🧪' }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Curriculum Subjects</Text>
      </View>

      {subjects.map((sub) => (
        <TouchableOpacity
          key={sub.id}
          style={styles.card}
          onClick={() => navigation.navigate('SubjectDetail', { subjectId: sub.id, subjectTitle: sub.title })}
        >
          <Text style={styles.icon}>{sub.icon}</Text>
          <View style={styles.details}>
            <Text style={styles.title}>{sub.title}</Text>
            <Text style={styles.subtitle}>{sub.subtitle}</Text>
            <Text style={styles.code}>{sub.code}</Text>
          </View>
          <Text style={styles.arrow}>&rsaquo;</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Interactive Learning Playgrounds</Text>
      </View>

      <TouchableOpacity
        style={styles.specialCard}
        onClick={() => navigation.navigate('Labs', { labId: 'chem-lab' })}
      >
        <Text style={styles.icon}>🧬</Text>
        <View style={styles.details}>
          <Text style={styles.specialTitle}>Virtual Science Labs</Text>
          <Text style={styles.subtitle}>Run interactive 3D simulations of lab chemistry and physics experiments.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.specialCard}
        onClick={() => navigation.navigate('Coding', { exerciseId: 'python-intro' })}
      >
        <Text style={styles.icon}>💻</Text>
        <View style={styles.details}>
          <Text style={styles.specialTitle}>Coding Editor Sandbox</Text>
          <Text style={styles.subtitle}>Write, execute and test real Python, HTML, and JS code.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.specialCard}
        onClick={() => navigation.navigate('PrePrimary', { ageGroup: 'k2' })}
      >
        <Text style={styles.icon}>🎨</Text>
        <View style={styles.details}>
          <Text style={styles.specialTitle}>K2 Early Learning Hub</Text>
          <Text style={styles.subtitle}>Pre-primary tracing, phonics, soundboards, and children stories.</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  sectionHeader: { marginBottom: 12, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#666', uppercase: true, trackingWith: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  specialCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f0fe', borderLeftWidth: 4, borderLeftColor: '#6200ee', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  icon: { fontSize: 32, marginRight: 16 },
  details: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#212121' },
  specialTitle: { fontSize: 16, fontWeight: 'bold', color: '#6200ee' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  code: { fontSize: 11, fontWeight: 'bold', color: '#999', marginTop: 4 },
  arrow: { fontSize: 24, color: '#ccc', fontWeight: '300' }
});
