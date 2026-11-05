import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { computeLevel, computeComplexityHandled } from './ai-level.service';
import type { Difficulty, StudentLevel } from './ai-level.service';
import { computeMastery } from './adaptive/mastery.service';
import * as gamificationService from './gamification.service';
import { nosqlGet, nosqlSet, nosqlUpdate, nosqlQuery } from './nosql.service';

const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
const EV2 = 'examV2';
const EAV2 = 'examAttemptV2';

async function getConceptsForChapter(_textbookId: string, chapterId: string) {
  const { data: rows, error } = await getSupabaseAdmin().from('concepts').select('*').eq('chapter_id', chapterId);
  if (error) throw error;
  return rows || [];
}

async function getQuestionsForConcept(conceptId: string) {
  const { data: rows, error } = await getSupabaseAdmin().from('concept_questions').select('*').eq('concept_id', conceptId);
  if (error) throw error;
  return rows || [];
}

export async function startExamAttempt(examId: string, studentId: string, selectedModels: string[]) {
  const supabase = getSupabaseAdmin();
  const { exists: examExists, data: examData } = await nosqlGet(EV2, examId);
  if (!examExists || !examData) throw new NotFoundError('Exam not found');

  if (!examData.releasedAt) throw new ForbiddenError('Exam is not yet released');

  const nowDate = new Date();
  if (examData.startDate && nowDate < new Date(examData.startDate as string)) throw new ForbiddenError('Exam has not started yet');
  if (examData.endDate && nowDate > new Date(examData.endDate as string)) throw new ForbiddenError('Exam has already ended');

  const existingAttempts = await nosqlQuery(EAV2, { examId, studentId });
  const maxAttempts = (examData.maxAttempts as number) || 1;
  if (existingAttempts.length >= maxAttempts) throw new ForbiddenError('Maximum attempts reached');

  const { data: userRow, error: userError } = await supabase.from('users').select('data').eq('id', studentId).maybeSingle();
  if (userError) throw userError;
  const studentLevel: StudentLevel = ((userRow?.data as any)?.level as StudentLevel) || 'beginner';

  const concepts = await getConceptsForChapter(examData.textbookId as string, examData.chapterId as string);
  if (concepts.length === 0) throw new NotFoundError('No concepts found in this chapter');

  const effectiveModels = selectedModels.length > 0 ? selectedModels : ((examData.selectedModels as string[]) || []);
  let allSelected: Array<{
    id: string;
    conceptId: string;
    type: string;
    difficulty?: Difficulty;
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
  }> = [];

  const storedQuestions = examData.questions as any[] | undefined;
  if (storedQuestions && storedQuestions.length > 0) {
    allSelected = storedQuestions.map((q: any) => ({
      id: q.id,
      conceptId: q.conceptId || concepts[0]?.id || '',
      type: q.type,
      difficulty: q.difficulty as Difficulty | undefined,
      text: q.text,
      options: q.options as string[] | undefined,
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      points: q.points || POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1,
    }));
    if (examData.shuffleQuestions !== false) {
      allSelected = [...allSelected].sort(() => Math.random() - 0.5);
    }
  } else {
    for (const c of concepts) {
      const questions = await getQuestionsForConcept(c.id);
      const questionBank = questions.map((q: any) => ({
        id: q.id,
        type: q.type,
        difficulty: q.difficulty as Difficulty | undefined,
        text: q.text || q.question,
        options: q.options as string[] | undefined,
        correctAnswer: q.correct_answer || q.correctAnswer || q.answer || '',
        explanation: q.explanation,
        points: q.points || 1,
      }));

      let available = questionBank.filter((q) => effectiveModels.includes(q.type));

      available = available.filter((q) => {
        const qRank = q.difficulty ? DIFFICULTY_RANK[q.difficulty] : 0;
        if (studentLevel === 'advanced') return qRank >= 1;
        if (studentLevel === 'intermediate') return qRank >= 0;
        return qRank <= 0;
      });

      available = [...available].sort(() => Math.random() - 0.5);
      const selected = available.slice(0, Math.min((examData.questionCountPerConcept as number) || 1, available.length));
      for (const q of selected) {
        allSelected.push({ ...q, conceptId: c.id });
      }
    }

    if (examData.shuffleQuestions !== false) {
      allSelected = [...allSelected].sort(() => Math.random() - 0.5);
    }
  }

  const totalPoints = allSelected.reduce((sum, q) => sum + (q.points || POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1), 0);

  const questionsForStudent = allSelected.map((q) => {
    const { correctAnswer, ...rest } = q;
    return rest;
  });

  const attemptId = uuidv4();
  const startedAt = new Date().toISOString();

  const attempt: Record<string, unknown> = {
    id: attemptId,
    examId,
    studentId,
    startedAt,
    submittedAt: null,
    answers: [],
    score: null,
    totalPoints,
    percentage: null,
    passed: null,
    timeSpent: 0,
    status: 'in_progress',
    selectedModels: effectiveModels,
    level: studentLevel,
  };

  await nosqlSet(EAV2, attemptId, attempt);

  const curAttemptCount = (examData.attemptCount as number) || 0;
  await nosqlUpdate(EV2, examId, { attemptCount: curAttemptCount + 1, updatedAt: new Date().toISOString() });

  logger.info('Exam V2 attempt started', { examId, studentId, attemptId });

  return { ...attempt, questions: questionsForStudent };
}

export async function submitExamAttempt(attemptId: string, studentId: string, data: {
  answers: Array<{
    questionId: string;
    answer: string | string[];
    timeSpent?: number;
  }>;
}) {
  const supabase = getSupabaseAdmin();
  const attemptData = (await nosqlGet(EAV2, attemptId)).data as Record<string, unknown> | null;
  if (!attemptData) throw new NotFoundError('Attempt not found');
  if (attemptData.studentId !== studentId) throw new ForbiddenError('Not your attempt');
  if (attemptData.status !== 'in_progress') throw new ForbiddenError('Attempt already submitted');

  const examData = (await nosqlGet(EV2, attemptData.examId as string)).data as Record<string, unknown> | null;
  if (!examData) throw new NotFoundError('Exam not found');

  const storedStartedAt = attemptData.startedAt as string;
  if (!storedStartedAt) throw new ForbiddenError('Invalid attempt state');
  const submittedAt = new Date().toISOString();
  const elapsedMinutes = (new Date(submittedAt).getTime() - new Date(storedStartedAt).getTime()) / 60000;
  const graceMinutes = 5;
  if (elapsedMinutes > ((examData.timeLimitMinutes as number) + graceMinutes)) throw new ForbiddenError('Time limit exceeded');

  const storedQuestions = examData.questions as any[] | undefined;
  let allQuestionBank: Array<{
    id: string;
    type: string;
    difficulty?: Difficulty;
    correctAnswer: string;
    points: number;
  }> = [];

  if (storedQuestions && storedQuestions.length > 0) {
    allQuestionBank = storedQuestions.map((q: any) => ({
      id: q.id,
      type: q.type,
      difficulty: q.difficulty as Difficulty | undefined,
      correctAnswer: q.correctAnswer || '',
      points: q.points || 1,
    }));
  } else {
    const concepts = await getConceptsForChapter(examData.textbookId as string, examData.chapterId as string);
    for (const c of concepts) {
      const questions = await getQuestionsForConcept(c.id);
      for (const q of questions) {
        allQuestionBank.push({
          id: q.id,
          type: q.type,
          difficulty: q.difficulty,
          correctAnswer: q.correct_answer || q.correctAnswer || q.answer || '',
          points: q.points || 1,
        });
      }
    }
  }

  let score = 0;
  const gradedAnswers: Array<Record<string, unknown>> = data.answers.map((answer) => {
    const question = allQuestionBank.find((q) => q.id === answer.questionId);
    if (!question) {
      return { questionId: answer.questionId, answer: answer.answer, isCorrect: false, pointsEarned: 0, timeSpent: answer.timeSpent || 0 };
    }

    let isCorrect = false;
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      isCorrect = answer.answer === question.correctAnswer;
    } else if (question.type === 'short_answer' || question.type === 'fill_blank') {
      isCorrect = answer.answer.toString().toLowerCase().trim() === question.correctAnswer?.toString().toLowerCase().trim();
    }

    const pointsEarned = isCorrect ? (question.points || POINTS_BY_DIFFICULTY[question.difficulty || 'medium'] || 1) : 0;
    if (isCorrect) score += pointsEarned;
    return { questionId: answer.questionId, answer: answer.answer, isCorrect, pointsEarned, timeSpent: answer.timeSpent || 0 };
  });

  const timeSpent = data.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  const totalPoints = (attemptData.totalPoints as number) || 0;
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const passingScore = (examData.passingScore as number) || 50;
  const passed = percentage >= passingScore;

  const accuracy = totalPoints > 0 ? score / totalPoints : 0;
  const avgReactionTime = gradedAnswers.length > 0
    ? gradedAnswers.reduce((sum: number, a: Record<string, unknown>) => sum + (a.timeSpent as number), 0) / gradedAnswers.length
    : 0;

  const difficultyMap: Record<string, Difficulty> = {};
  for (const q of allQuestionBank) {
    difficultyMap[q.id] = q.difficulty || 'easy';
  }
  const complexityHandled = computeComplexityHandled(
    gradedAnswers.map((a: Record<string, unknown>) => ({ questionId: a.questionId as string, correct: a.isCorrect as boolean })),
    difficultyMap,
  );
  const newLevel = computeLevel(accuracy, avgReactionTime, complexityHandled);

  const { data: existing } = await supabase.from('users').select('data').eq('id', studentId).maybeSingle();
  const merged = { ...((existing?.data as Record<string, unknown>) || {}), level: newLevel };
  const { error } = await supabase.from('users').update({ data: merged }).eq('id', studentId);
  if (error) throw error;

  const result: Record<string, unknown> = {
    answers: gradedAnswers, score, totalPoints, percentage, passed, timeSpent,
    submittedAt, status: 'completed',
  };
  await nosqlUpdate(EAV2, attemptId, result);

  // Write a formal grade record so the result counts toward report cards,
  // rankings, and recommendations (same as quiz/assignment V2 submits).
  try {
    let subjectId = (examData.subjectId as string) || null;
    if (!subjectId && examData.textbookId) {
      const { data: tbRow } = await supabase
        .from('textbooks')
        .select('subject_id')
        .eq('id', examData.textbookId as string)
        .maybeSingle();
      subjectId = (tbRow as any)?.subject_id || null;
    }
    const nowIso = new Date().toISOString();
    const { error: gradeErr } = await supabase.from('firestore_docs').insert({
      collection: 'grades',
      doc_id: uuidv4(),
      data: {
        studentId,
        courseId: examData.courseId || null,
        subjectId,
        classId: examData.classId || null,
        itemName: (examData.title as string) || 'Exam',
        score,
        totalPoints,
        percentage,
        gradedBy: 'auto',
        attemptId,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    });
    if (gradeErr) logger.warn('Failed to create exam grade record', { attemptId, error: gradeErr.message });
  } catch (gradeErr) {
    logger.warn('Failed to create exam grade record', { attemptId, error: gradeErr });
  }

  logger.info('Exam V2 attempt submitted', { attemptId, studentId, score, percentage, newLevel });

  const allNewBadges: string[] = [];
  const collect = (r: string[] | { newBadges?: string[] }) => {
    const ids = Array.isArray(r) ? r : r?.newBadges;
    if (ids) for (const b of ids) if (!allNewBadges.includes(b)) allNewBadges.push(b);
  };

  try {
    collect(await gamificationService.recordAssessmentResult(studentId, percentage));
    collect(await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.assessmentComplete, `Completed exam: ${examData.title}`));
    collect(await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.assessmentComplete, `Completed exam: ${examData.title}`));
    if (percentage >= 80) {
      collect(await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${examData.title}`));
      collect(await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${examData.title}`));
    }
    if (percentage === 100) {
      collect(await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.perfectScore, `Perfect score on ${examData.title}`));
      collect(await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.perfectScore, `Perfect score on ${examData.title}`));
    }
    await gamificationService.updateStreak(studentId);
  } catch (gamErr) {
    logger.error('Gamification reward failed', { studentId, examId: attemptData.examId, error: gamErr });
  }

  const masteryAccuracy = totalPoints > 0 ? score / totalPoints : 0;
  const chapterConcepts = storedQuestions?.length
    ? await getConceptsForChapter(examData.textbookId as string, examData.chapterId as string)
    : await getConceptsForChapter(examData.textbookId as string, examData.chapterId as string);
  for (const c of chapterConcepts) {
    computeMastery(studentId, c.id, masteryAccuracy).catch(err =>
      logger.error('Exam V2 mastery update failed', { studentId, conceptId: c.id, error: err })
    );
  }

  return { id: attemptId, ...attemptData, ...result, level: newLevel, newBadges: allNewBadges };
}

export async function releaseExamGrades(examId: string, showResults: boolean) {
  const { exists } = await nosqlGet(EV2, examId);
  if (!exists) throw new NotFoundError('Exam not found');
  await nosqlUpdate(EV2, examId, { showResults, updatedAt: new Date().toISOString() });
  logger.info('Exam V2 grades release toggled', { examId, showResults });
  const updated = await nosqlGet(EV2, examId);
  return { id: examId, ...updated.data };
}

export async function getExamResults(examId: string, studentId: string) {
  const nq = await nosqlGet(EV2, examId);
  const examData = nq.data as Record<string, unknown> | null;
  if (!examData) throw new NotFoundError('Exam not found');
  const resultsGated = !(examData.showResults as boolean);

  const attempts = await nosqlQuery(EAV2, { examId, studentId });
  const sorted = attempts.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return sorted.map((data: any) => {
    if (resultsGated && data.status === 'completed') {
      return {
        id: data.id, examId: data.examId, studentId: data.studentId,
        score: data.score, totalPoints: data.totalPoints, percentage: data.percentage,
        passed: data.passed, timeSpent: data.timeSpent, startedAt: data.startedAt,
        submittedAt: data.submittedAt, status: data.status,
        selectedModels: data.selectedModels, level: data.level,
        answers: data.answers?.map((a: { questionId: string; pointsEarned: number }) => ({
          questionId: a.questionId, pointsEarned: a.pointsEarned,
        })) ?? [],
      };
    }
    return data;
  });
}
