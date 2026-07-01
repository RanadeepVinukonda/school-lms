import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function SubjectDetailScreen({ route, navigation }: any) {
  const { subjectTitle } = route.params || { subjectTitle: 'Mathematics' };
  const [activeChapter, setActiveChapter] = useState<number | null>(null);

  const chapters = [
    {
      id: 1,
      title: 'Chapter 1: Linear Equations',
      lessons: ['Introduction to Linear Equations', 'Solving Equations with Two Variables', 'Graphing Linear Functions']
    },
    {
      id: 2,
      title: 'Chapter 2: Quadratic Equations',
      lessons: ['Introduction to Quadratics', 'Factoring Quadratic Form', 'The Quadratic Formula']
    },
    {
      id: 3,
      title: 'Chapter 3: Complex Numbers',
      lessons: ['Imaginary Unit i', 'Complex Arithmetic Operations', 'Polar Form representation']
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{subjectTitle}</Text>
        <Text style={styles.subtitle}>Tap a chapter to inspect lessons and test your knowledge.</Text>
      </View>

      {/* Chapters list */}
      {chapters.map((ch) => (
        <View key={ch.id} style={styles.chapterWrapper}>
          <TouchableOpacity
            style={styles.chapterHeader}
            onClick={() => setActiveChapter(activeChapter === ch.id ? null : ch.id)}
          >
            <Text style={styles.chapterTitle}>{ch.title}</Text>
            <Text style={styles.toggleIcon}>{activeChapter === ch.id ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {activeChapter === ch.id && (
            <View style={styles.lessonList}>
              {ch.lessons.map((les, idx) => (
                <View key={idx} style={styles.lessonItem}>
                  <Text style={styles.lessonBullet}>•</Text>
                  <Text style={styles.lessonName}>{les}</Text>
                </View>
              ))}

              {/* Quiz Launch */}
              <TouchableOpacity
                style={styles.quizBtn}
                onClick={() => navigation.navigate('Quiz', { chapterId: ch.id, chapterTitle: ch.title })}
              >
                <Text style={styles.quizBtnText}>⚡ Take Adaptive Quiz</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#212121' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  chapterWrapper: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 10, overflow: 'hidden', borderBorderWidth: 1, borderColor: '#eee' },
  chapterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  chapterTitle: { fontSize: 15, fontWeight: 'bold', color: '#212121' },
  toggleIcon: { fontSize: 12, color: '#999' },
  lessonList: { padding: 16, backgroundColor: '#fafafa', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  lessonItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  lessonBullet: { color: '#6200ee', fontWeight: 'bold', marginRight: 8, fontSize: 16 },
  lessonName: { fontSize: 13, color: '#333' },
  quizBtn: { marginTop: 12, backgroundColor: '#6200ee', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  quizBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 }
});
