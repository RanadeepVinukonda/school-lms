import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api, LoadingState, ErrorState, EmptyState } from '@genesis-lms/shared';

const FALLBACK_QUESTIONS = [
  { q: 'Solve for x: 3x + 5 = 20', options: ['x = 3', 'x = 5', 'x = 4', 'x = 6'], correct: 1 },
  { q: 'Find the slope of the line parallel to y = -2x + 7', options: ['2', '-2', '1/2', '-1/2'], correct: 1 },
  { q: 'What is the y-intercept of the line 4x - 2y = 8?', options: ['4', '-4', '2', '-2'], correct: 1 },
];

export default function QuizScreen({ route, navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any>(null);
  const { chapterTitle, chapterId } = route.params || { chapterTitle: 'Linear Equations' };
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const endpoint = chapterId ? `/quiz/${chapterId}` : '/quiz';
      const res = await api.get(endpoint);
      setQuestions(res.data);
    } catch { setQuestions(FALLBACK_QUESTIONS); }
    finally { setLoading(false); setRefreshing(false); }
  }, [chapterId]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchQuestions(); }, [fetchQuestions]);

  if (loading && !refreshing) return <LoadingState />;
  if (!questions) return <ErrorState message="Failed to load questions" onRetry={fetchQuestions} />;
  const qList = Array.isArray(questions) ? questions : (questions?.questions || []);

  const handleNext = () => {
    if (selectedAns === qList[step].correct) { setScore(score + 1); }
    setSelectedAns(null);
    setStep(step + 1);
  };

  const isQuizFinished = step >= qList.length;

  return (
    <View style={styles.container}>
      {qList.length === 0 && (
        <EmptyState message="No questions available for this quiz." />
      )}
      {!isQuizFinished && qList.length > 0 ? (
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}>
          <Text style={styles.progress}>Question {step + 1} of {qList.length}</Text>
          <Text style={styles.questionText}>{qList[step].q}</Text>

          {qList[step].options.map((opt: string, idx: number) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.optionCard,
                selectedAns === idx && styles.selectedOption
              ]}
              onPress={() => setSelectedAns(idx)}
            >
              <Text style={[styles.optionText, selectedAns === idx && styles.selectedOptionText]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.nextBtn, selectedAns === null && styles.disabledBtn]}
            disabled={selectedAns === null}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>Next Question ›</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.resultContainer}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.resultTitle}>Quiz Completed!</Text>
          <Text style={styles.resultScore}>
            Your Score: {score} / {qList.length} ({Math.round((score / qList.length) * 100)}%)
          </Text>
          <Text style={styles.badgeInfo}>
            Level Updated: Intermediate Level 🌟
          </Text>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
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
  optionCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
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
