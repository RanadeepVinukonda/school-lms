import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function QuizScreen({ route, navigation }: any) {
  const { chapterTitle } = route.params || { chapterTitle: 'Linear Equations' };
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);

  const questions = [
    {
      q: 'Solve for x: 3x + 5 = 20',
      options: ['x = 3', 'x = 5', 'x = 4', 'x = 6'],
      correct: 1
    },
    {
      q: 'Find the slope of the line parallel to y = -2x + 7',
      options: ['2', '-2', '1/2', '-1/2'],
      correct: 1
    },
    {
      q: 'What is the y-intercept of the line 4x - 2y = 8?',
      options: ['4', '-4', '2', '-2'],
      correct: 1
    }
  ];

  const handleNext = () => {
    if (selectedAns === questions[step].correct) {
      setScore(score + 1);
    }
    setSelectedAns(null);
    setStep(step + 1);
  };

  const isQuizFinished = step >= questions.length;

  return (
    <View style={styles.container}>
      {!isQuizFinished ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.progress}>Question {step + 1} of {questions.length}</Text>
          <Text style={styles.questionText}>{questions[step].q}</Text>

          {questions[step].options.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.optionCard,
                selectedAns === idx && styles.selectedOption
              ]}
              onClick={() => setSelectedAns(idx)}
            >
              <Text style={[styles.optionText, selectedAns === idx && styles.selectedOptionText]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.nextBtn, selectedAns === null && styles.disabledBtn]}
            disabled={selectedAns === null}
            onClick={handleNext}
          >
            <Text style={styles.nextBtnText}>Next Question &rsaquo;</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.resultContainer}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.resultTitle}>Quiz Completed!</Text>
          <Text style={styles.resultScore}>
            Your Score: {score} / {questions.length} ({Math.round((score / questions.length) * 100)}%)
          </Text>
          <Text style={styles.badgeInfo}>
            Level Updated: Intermediate Level 🌟
          </Text>

          <TouchableOpacity
            style={styles.doneBtn}
            onClick={() => navigation.goBack()}
          >
            <Text style={styles.doneBtnText}>Return to Chapters</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  progress: { fontSize: 13, color: '#666', fontWeight: 'bold', marginBottom: 12 },
  questionText: { fontSize: 18, fontWeight: 'bold', color: '#212121', marginBottom: 24, lineHeight: 26 },
  optionCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, borderBorderWidth: 1, borderColor: '#e0e0e0' },
  selectedOption: { borderColor: '#6200ee', backgroundColor: '#f1f0fe' },
  optionText: { fontSize: 15, color: '#444' },
  selectedOptionText: { color: '#6200ee', fontWeight: 'bold' },
  nextBtn: { backgroundColor: '#6200ee', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  disabledBtn: { backgroundColor: '#ccc' },
  nextBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  trophy: { fontSize: 72, marginBottom: 20 },
  resultTitle: { fontSize: 24, fontWeight: 'bold', color: '#212121' },
  resultScore: { fontSize: 16, color: '#666', marginTop: 8 },
  badgeInfo: { fontSize: 14, color: '#4caf50', fontWeight: '600', marginTop: 12 },
  doneBtn: { marginTop: 32, backgroundColor: '#6200ee', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  doneBtnText: { color: '#ffffff', fontWeight: 'bold' }
});
