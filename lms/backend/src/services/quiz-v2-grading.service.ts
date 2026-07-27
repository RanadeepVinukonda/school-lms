import { NotFoundError } from '../utils/errors';
import { nosqlGet, nosqlQuery } from './nosql.service';
import { POINTS_BY_DIFFICULTY } from './quiz-v2-question.service';

const QV2 = 'quizV2';
const QAV2 = 'quizAttemptV2';

export async function getQuizResults(quizId: string, studentId: string) {
  const nq = await nosqlGet(QV2, quizId);
  const quizData = nq.data as Record<string, unknown> | null;
  if (!quizData) throw new NotFoundError('Quiz not found');
  const resultsGated = !(quizData.showResults as boolean);

  const attempts = await nosqlQuery(QAV2, { quizId, studentId });

  const completed = attempts.filter((a: any) => a.status === 'completed' && a.percentage != null);
  if (completed.length === 0) {
    return [];
  }

  const best = completed.reduce((best: any, curr: any) =>
    curr.percentage > best.percentage ? curr : best
  );

  const quizQuestionsMap: Record<string, { correctAnswer: string; explanation: string; difficulty: string }> = {};
  for (const q of ((quizData.questions as any[]) || [])) {
    quizQuestionsMap[q.id] = { correctAnswer: q.correctAnswer || '', explanation: q.explanation || '', difficulty: q.difficulty || 'medium' };
  }

  const results = [best].map((data: any) => {
    if (resultsGated && data.status === 'completed') {
      return {
        id: data.id, quizId: data.quizId, studentId: data.studentId,
        score: data.score, totalPoints: data.totalPoints, percentage: data.percentage,
        passed: data.passed, timeSpent: data.timeSpent, startedAt: data.startedAt,
        submittedAt: data.submittedAt, status: data.status,
        selectedModels: data.selectedModels, level: data.level, showResults: false,
        answers: data.answers?.map((a: { questionId: string; pointsEarned: number }) => ({
          questionId: a.questionId, pointsEarned: a.pointsEarned,
        })) ?? [],
      };
    }
    let regradedScore = 0;
    let regradedTotal = (data.totalPoints as number) || 0;
    const answers = (data.answers || []).map((a: any) => {
      if (a.skipped) {
        const pointVal = quizQuestionsMap[a.questionId]
          ? (POINTS_BY_DIFFICULTY[quizQuestionsMap[a.questionId].difficulty] || 1)
          : 1;
        regradedTotal -= pointVal;
        return { ...a, correctAnswer: a.correctAnswer || quizQuestionsMap[a.questionId]?.correctAnswer || '' };
      }
      if (!a.correctAnswer && quizQuestionsMap[a.questionId]) {
        const q = quizQuestionsMap[a.questionId];
        const normalize = (v: unknown) => v?.toString().toLowerCase().trim() || '';
        const isCorrect = normalize(a.answer) === normalize(q.correctAnswer);
        const pointsEarned = isCorrect ? (POINTS_BY_DIFFICULTY[q.difficulty] || 1) : 0;
        regradedScore += pointsEarned;
        return { ...a, correctAnswer: q.correctAnswer, explanation: a.explanation || q.explanation, isCorrect, pointsEarned };
      }
      regradedScore += a.pointsEarned || 0;
      return a;
    });
    const tp = Math.max(regradedTotal, 1);
    const pct = Math.round((regradedScore / tp) * 100);
    return { ...data, showResults: (quizData.showResults as boolean) ?? false, answers, score: regradedScore, percentage: pct };
  });

  return results;
}
