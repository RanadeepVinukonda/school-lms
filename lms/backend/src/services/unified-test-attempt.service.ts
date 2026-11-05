import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import * as gamificationService from './gamification.service';
import { computeLevel, computeComplexityHandled } from './ai-level.service';
import type { Difficulty, StudentLevel } from './ai-level.service';
import { createNotification } from './notification.service';
import { nosqlGet, nosqlSet, nosqlUpdate, nosqlQuery } from './nosql.service';

const QV2 = 'quizV2';
const QAV2 = 'quizAttemptV2';
const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

export async function startTestAttempt(testId: string, studentId: string): Promise<any> {
  const supabase = getSupabaseAdmin();
  const { exists: testExists, data: testData } = await nosqlGet(QV2, testId);
  if (!testExists || !testData) throw new NotFoundError('Test not found');
  if (!testData.releasedAt) throw new ForbiddenError('Test is not yet released');
  if (testData.startDate && new Date() < new Date(testData.startDate as string)) throw new ForbiddenError('Test has not started yet');
  if (testData.endDate && new Date() > new Date(testData.endDate as string)) throw new ForbiddenError('Test has already ended');

  const tData = testData as any;
  if (tData.publishedTo === 'students' && tData.targetStudentIds?.length > 0) {
    if (!tData.targetStudentIds.includes(studentId)) throw new ForbiddenError('This test is not assigned to you');
  }

  const attempts = await nosqlQuery(QAV2, { quizId: testId, studentId });
  if (attempts.length >= tData.maxAttempts) throw new ForbiddenError('Maximum attempts reached');

  const { data: userRow } = await supabase.from('users').select('data').eq('id', studentId).maybeSingle();
  const studentLevel: StudentLevel = ((userRow?.data as any)?.level as StudentLevel) || 'beginner';

  const questionBank = tData.questions || [];
  let available = [...questionBank];
  if (tData.shuffleQuestions !== false) available = [...available].sort(() => Math.random() - 0.5);

  const selected = available.slice(0, Math.min(tData.questionCount || available.length, available.length));

  const questionsForStudent = selected.map((q: any) => {
    if (tData.isRepublished) return q;
    const { correctAnswer, ...rest } = q;
    return rest;
  });

  const attemptId = randomUUID();
  const now = new Date().toISOString();

  const attempt: Record<string, unknown> = {
    id: attemptId, quizId: testId, studentId, startedAt: now, submittedAt: null,
    answers: [], score: null,
    totalPoints: selected.reduce((sum: number, q: any) => sum + (POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1), 0),
    percentage: null, passed: null, timeSpent: 0, status: 'in_progress',
    selectedModels: tData.selectedModels, level: studentLevel, testType: tData.testType,
  };

  await nosqlSet(QAV2, attemptId, attempt);

  const curCount = (tData.attemptCount as number) || 0;
  await nosqlUpdate(QV2, testId, { attemptCount: curCount + 1, updatedAt: now });

  logger.info('Test attempt started', { testId, studentId, attemptId, testType: tData.testType });
  return { ...attempt, questions: questionsForStudent };
}

export async function submitTestAttempt(attemptId: string, studentId: string, data: {
  answers: Array<{ questionId: string; answer: string | string[]; timeSpent?: number }>;
}): Promise<any> {
  const supabase = getSupabaseAdmin();
  const attemptData = (await nosqlGet(QAV2, attemptId)).data as Record<string, unknown> | null;
  if (!attemptData) throw new NotFoundError('Attempt not found');
  if (attemptData.studentId !== studentId) throw new ForbiddenError('Not your attempt');
  if (attemptData.status !== 'in_progress') throw new ForbiddenError('Attempt already submitted');

  const testData = (await nosqlGet(QV2, attemptData.quizId as string)).data as Record<string, unknown> | null;
  if (!testData) throw new NotFoundError('Test not found');

  const storedStartedAt = attemptData.startedAt as string;
  if (!storedStartedAt) throw new ForbiddenError('Invalid attempt state');
  const submittedAt = new Date().toISOString();
  const elapsedMinutes = (new Date(submittedAt).getTime() - new Date(storedStartedAt).getTime()) / 60000;
  const graceMinutes = 5;
  if (elapsedMinutes > ((testData.timeLimitMinutes as number) + graceMinutes)) throw new ForbiddenError('Time limit exceeded');

  const questionBank = (testData.questions as any[]) || [];
  const showResults = !!(testData.showResults);

  let score = 0;
  const gradedAnswers = data.answers.map((answer) => {
    const question = questionBank.find((q: any) => q.id === answer.questionId);
    if (!question) {
      return { questionId: answer.questionId, answer: answer.answer, isCorrect: false, pointsEarned: 0, timeSpent: answer.timeSpent || 0 };
    }

    let isCorrect = false;
    const normalize = (v: unknown) => v?.toString().toLowerCase().trim() || '';

    if (['multiple_choice', 'mcq', 'true_false', 'passage'].includes(question.type)) {
      isCorrect = normalize(answer.answer) === normalize(question.correctAnswer);
    } else if (['short_answer', 'fill_blank'].includes(question.type)) {
      isCorrect = normalize(answer.answer) === normalize(question.correctAnswer);
    } else if (question.type === 'numerical') {
      const studentNum = parseFloat(normalize(answer.answer));
      const correctNum = parseFloat(normalize(question.correctAnswer));
      isCorrect = !isNaN(studentNum) && !isNaN(correctNum) && Math.abs(studentNum - correctNum) < 0.001;
    } else if (question.type === 'matching') {
      const parseMatchPairs = (s: string): Record<string, string> => {
        const pairs: Record<string, string> = {};
        if (s.includes('||')) {
          s.split('||').forEach((part) => {
            const sepIdx = part.indexOf(':');
            if (sepIdx > 0) pairs[part.slice(0, sepIdx).trim().toLowerCase()] = part.slice(sepIdx + 1).trim().toLowerCase();
          });
        } else {
          s.split(',').forEach((part) => {
            part = part.trim();
            const dashIdx = part.indexOf('-');
            if (dashIdx > 0) pairs[part.slice(0, dashIdx).trim().toLowerCase()] = part.slice(dashIdx + 1).trim().toLowerCase();
          });
        }
        return pairs;
      };
      const studentPairs = parseMatchPairs(answer.answer.toString());
      const correctPairs = parseMatchPairs(question.correctAnswer || '');
      isCorrect = Object.keys(correctPairs).length > 0 &&
        Object.entries(correctPairs).every(([k, v]) => studentPairs[k] === v);
    } else if (['assertion_reason', 'case_study', 'application_based'].includes(question.type)) {
      isCorrect = normalize(answer.answer) === normalize(question.correctAnswer);
    } else if (['descriptive', 'hots'].includes(question.type)) {
      isCorrect = answer.answer.toString().trim().length > 10;
    }

    const pointsEarned = isCorrect ? (POINTS_BY_DIFFICULTY[question.difficulty || 'medium'] || 1) : 0;
    if (isCorrect) score += pointsEarned;

    const graded: Record<string, unknown> = {
      questionId: answer.questionId, questionText: question.text, answer: answer.answer,
      isCorrect, pointsEarned, timeSpent: answer.timeSpent || 0,
    };
    if (showResults) { graded.correctAnswer = question.correctAnswer; graded.explanation = question.explanation; }
    return graded;
  });

  const timeSpent = data.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  const totalPoints = (attemptData.totalPoints as number) || 0;
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const passed = percentage >= ((testData.passingScore as number) || 50);

  const accuracy = totalPoints > 0 ? score / totalPoints : 0;
  const avgReactionTime = gradedAnswers.length > 0
    ? gradedAnswers.reduce((sum: number, a: any) => sum + (a.timeSpent || 0), 0) / gradedAnswers.length
    : 0;

  const difficultyMap: Record<string, Difficulty> = {};
  for (const q of questionBank) { difficultyMap[q.id] = q.difficulty || 'easy'; }

  const complexityHandled = computeComplexityHandled(
    gradedAnswers.map((a: any) => ({ questionId: a.questionId, correct: a.isCorrect })),
    difficultyMap,
  );
  const newLevel = computeLevel(accuracy, avgReactionTime, complexityHandled);

  const { data: existing } = await supabase.from('users').select('data').eq('id', studentId).maybeSingle();
  const merged = { ...((existing?.data as Record<string, unknown>) || {}), level: newLevel };
  const { error: levelUpdateErr } = await supabase.from('users').update({ data: merged }).eq('id', studentId);
  if (levelUpdateErr) throw new Error(`Failed to update user level: ${levelUpdateErr.message}`);

  const result: Record<string, unknown> = {
    answers: gradedAnswers, score, totalPoints, percentage, passed,
    timeSpent, submittedAt, status: 'completed',
  };
  await nosqlUpdate(QAV2, attemptId, result);

  logger.info('Test attempt submitted', { attemptId, studentId, score, percentage, newLevel });

  const allNewBadges: string[] = [];
  const collect = (r: string[] | { newBadges?: string[] }) => {
    const ids = Array.isArray(r) ? r : r?.newBadges;
    if (ids) for (const b of ids) if (!allNewBadges.includes(b)) allNewBadges.push(b);
  };

  try {
    collect(await gamificationService.recordAssessmentResult(studentId, percentage));
    collect(await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.assessmentComplete, `Completed test: ${testData.title}`));
    collect(await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.assessmentComplete, `Completed test: ${testData.title}`));
    if (percentage >= 80) {
      collect(await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${testData.title}`));
      collect(await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${testData.title}`));
    }
    if (percentage === 100) {
      collect(await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.perfectScore, `Perfect score on ${testData.title}`));
      collect(await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.perfectScore, `Perfect score on ${testData.title}`));
    }
    await gamificationService.updateStreak(studentId);
  } catch (gamErr) {
    logger.error('Gamification reward failed in unified test', { studentId, testId: attemptData.quizId, error: gamErr });
  }

  try {
    const { data: sRow } = await supabase.from('users').select('display_name, email').eq('id', studentId).maybeSingle();
    const studentName = sRow?.display_name || sRow?.email || 'Unknown';
    await createNotification({
      userId: testData.teacherId as string,
      type: 'test_submitted',
      title: `Test submitted: ${testData.title}`,
      body: `${studentName} submitted the ${testData.testType} "${testData.title}" with score ${percentage}%.`,
      data: { testId: attemptData.quizId, studentId, percentage, passed },
    });
  } catch (notifErr) {
    logger.error('Failed to send submission notification to teacher', { attemptId, error: notifErr });
  }

  return { id: attemptId, ...attemptData, ...result, level: newLevel, newBadges: allNewBadges };
}
