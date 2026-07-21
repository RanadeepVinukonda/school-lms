import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { computeLevel, computeComplexityHandled } from './ai-level.service';
import type { Difficulty, StudentLevel } from './ai-level.service';
import { deleteDocument } from './document.service';
import * as gamificationService from './gamification.service';

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
const EV2 = 'examV2';
const EAV2 = 'examAttemptV2';

async function nosqlGet(col: string, id: string) {
  const { data: row, error } = await getSupabaseAdmin().from('firestore_docs').select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  if (error) throw error;
  return { exists: !!row, data: (row?.data as Record<string, unknown>) ?? null };
}

async function nosqlSet(col: string, id: string, data: Record<string, unknown>) {
  const { error } = await getSupabaseAdmin().from('firestore_docs').upsert({
    collection: col, doc_id: id, data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
}

async function nosqlUpdate(col: string, id: string, updates: Record<string, unknown>) {
  const { data: existing, error: existingError } = await getSupabaseAdmin().from('firestore_docs').select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  if (existingError) throw existingError;
  const merged = { ...((existing?.data as Record<string, unknown>) || {}), ...updates };
  const { error } = await getSupabaseAdmin().from('firestore_docs').upsert({
    collection: col, doc_id: id, data: merged,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
}

async function nosqlDelete(col: string, id: string) {
  await deleteDocument(col, id);
}

async function nosqlQuery(col: string, filters: Record<string, unknown>) {
  let q: any = getSupabaseAdmin().from('firestore_docs').select('doc_id, data').eq('collection', col);
  for (const [k, v] of Object.entries(filters)) {
    q = q.contains('data', { [k]: v });
  }
  const { data: rows, error } = await q;
  if (error) throw error;
  return (rows || []).map((r: { doc_id: string; data: unknown }) => ({ id: r.doc_id, ...(r.data as object) }));
}

async function getConceptsForChapter(textbookId: string, chapterId: string) {
  const { data: rows, error } = await getSupabaseAdmin().from('concepts').select('*').eq('chapter_id', chapterId);
  if (error) throw error;
  return rows || [];
}

async function getQuestionsForConcept(conceptId: string) {
  const { data: rows, error } = await getSupabaseAdmin().from('concept_questions').select('*').eq('concept_id', conceptId);
  if (error) throw error;
  return rows || [];
}

export async function getAvailableTypesForChapter(textbookId: string, chapterId: string) {
  const concepts = await getConceptsForChapter(textbookId, chapterId);
  const conceptIds = concepts.map((c: any) => c.id);
  if (conceptIds.length === 0) return [];
  const { data: rows, error } = await getSupabaseAdmin()
    .from('concept_questions')
    .select('type')
    .in('concept_id', conceptIds);
  if (error) throw error;
  const types = new Set((rows || []).map((r: any) => r.type));
  return Array.from(types);
}

export async function getAvailableTypesForConcept(conceptId: string) {
  const { data: rows, error } = await getSupabaseAdmin()
    .from('concept_questions')
    .select('type')
    .eq('concept_id', conceptId);
  if (error) throw error;
  const types = new Set((rows || []).map((r: any) => r.type));
  return Array.from(types);
}

export async function createExam(data: {
  title: string;
  description?: string;
  classId: string;
  textbookId: string;
  chapterId: string;
  teacherId: string;
  timeLimitMinutes: number;
  selectedModels: string[];
  questionCountPerConcept: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  startDate?: string;
  endDate?: string;
  schoolId?: string;
  questions?: any[];
  preview?: boolean;
}) {
  const assignment = await getTeacherAssignment(data.teacherId, data.classId);
  if (!assignment) {
    throw new ForbiddenError('You are not assigned to this class');
  }

  const concepts = await getConceptsForChapter(data.textbookId, data.chapterId);
  if (concepts.length === 0) {
    throw new NotFoundError('No concepts found in this chapter');
  }

  const perConcept = Math.ceil(data.questionCountPerConcept / concepts.length);

  let totalPoints = 0;
  let allSelectedQuestions: Array<Record<string, unknown>> = [];

  if (data.questions && data.questions.length > 0) {
    allSelectedQuestions = data.questions.map((q: any) => ({
      id: q.id || uuidv4(),
      type: q.type || 'mcq',
      text: q.text || q.question || '',
      options: q.options || null,
      correctAnswer: q.correctAnswer || q.answer || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      points: q.points || POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1,
      conceptId: q.conceptId || concepts[0]?.id || '',
    }));
    totalPoints = allSelectedQuestions.reduce((sum, q) => sum + (q.points as number), 0);
  } else {
    let remaining = data.questionCountPerConcept;
    for (const c of concepts) {
      const questions = await getQuestionsForConcept(c.id);
      const filtered = questions.filter((q: any) => data.selectedModels.includes(q.type));
      const take = Math.min(perConcept, remaining, filtered.length);
      const selected = filtered.slice(0, take);
      remaining -= selected.length;
      totalPoints += selected.reduce((sum: number, q: any) => sum + (q.points || POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1), 0);
      for (const q of selected) {
        allSelectedQuestions.push({
          id: q.id,
          type: q.type,
          text: q.text || q.question,
          options: q.options,
          correctAnswer: q.correct_answer || q.correctAnswer || q.answer || '',
          explanation: q.explanation,
          difficulty: q.difficulty || 'medium',
          points: q.points || POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1,
          conceptId: c.id,
        });
      }
    }
  }

  if (data.preview) {
    return {
      questions: allSelectedQuestions,
      totalPoints,
      questionCount: allSelectedQuestions.length,
      aiGeneratedCount: 0,
      preview: true,
    };
  }

  const examId = uuidv4();
  const now = new Date().toISOString();

  const examData: Record<string, unknown> = {
    id: examId,
    title: data.title,
    description: data.description || '',
    classId: data.classId,
    textbookId: data.textbookId,
    chapterId: data.chapterId,
    teacherId: data.teacherId,
    timeLimitMinutes: data.timeLimitMinutes,
    selectedModels: data.selectedModels,
    questionCountPerConcept: perConcept,
    questionCount: allSelectedQuestions.length,
    totalPoints,
    passingScore: data.passingScore ?? 50,
    maxAttempts: data.maxAttempts ?? 1,
    shuffleQuestions: data.shuffleQuestions ?? true,
    showResults: data.showResults ?? false,
    attemptCount: 0,
    releasedAt: null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    schoolId: data.schoolId || '',
    createdAt: now,
    updatedAt: now,
  };

  await nosqlSet(EV2, examId, examData);

  logger.info('Exam V2 created', { examId, classId: data.classId, title: data.title });

  return examData;
}

export async function releaseExam(examId: string, teacherId: string) {
  const { exists, data: examData } = await nosqlGet(EV2, examId);
  if (!exists || !examData) throw new NotFoundError('Exam not found');
  if (examData.teacherId !== teacherId) throw new ForbiddenError('You do not own this exam');

  const now = new Date().toISOString();
  await nosqlUpdate(EV2, examId, { releasedAt: now, updatedAt: now });
  const updated = await nosqlGet(EV2, examId);
  logger.info('Exam V2 released', { examId, teacherId });
  return { id: examId, ...updated.data };
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

  const concepts = await getConceptsForChapter(examData.textbookId as string, examData.chapterId as string);
  const allQuestionBank: Array<{
    id: string;
    type: string;
    difficulty?: Difficulty;
    correctAnswer: string;
    points: number;
  }> = [];
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

  logger.info('Exam V2 attempt submitted', { attemptId, studentId, score, percentage, newLevel });

  try {
    await gamificationService.recordAssessmentResult(studentId, percentage);
    await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.assessmentComplete, `Completed exam: ${examData.title}`);
    await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.assessmentComplete, `Completed exam: ${examData.title}`);
    if (percentage >= 80) {
      await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${examData.title}`);
      await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${examData.title}`);
    }
    if (percentage === 100) {
      await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.perfectScore, `Perfect score on ${examData.title}`);
      await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.perfectScore, `Perfect score on ${examData.title}`);
    }
    await gamificationService.updateStreak(studentId);
  } catch (gamErr) {
    logger.error('Gamification reward failed', { studentId, examId: attemptData.examId, error: gamErr });
  }

  return { id: attemptId, ...attemptData, ...result, level: newLevel };
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

export async function getExamById(examId: string) {
  const { exists, data } = await nosqlGet(EV2, examId);
  if (!exists || !data) throw new NotFoundError('Exam not found');
  const exam: any = { id: examId, ...data };
  if (!exam.questionCount && exam.questions?.length) {
    exam.questionCount = exam.questions.length;
  }
  return exam;
}

export async function listExamsForClass(classId: string, _schoolId?: string): Promise<any[]> {
  const items = await nosqlQuery(EV2, { classId });
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listExamsForTeacher(teacherId: string, _schoolId?: string): Promise<any[]> {
  const items = await nosqlQuery(EV2, { teacherId });
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function logProctoringEvent(attemptId: string, studentId: string, eventData: { event: string; timestamp?: string }) {
  const attempt = (await nosqlGet(EAV2, attemptId)).data as Record<string, unknown> | null;
  if (!attempt) throw new NotFoundError('Attempt not found');
  if (attempt.studentId !== studentId) throw new ForbiddenError('Not your attempt');

  const logEntry = { id: uuidv4(), event: eventData.event, timestamp: eventData.timestamp || new Date().toISOString() };
  const logs = ((attempt.proctoringLogs as Array<Record<string, unknown>>) || []);
  logs.push(logEntry);
  await nosqlUpdate(EAV2, attemptId, { proctoringLogs: logs });
  return logEntry;
}

export async function getStudentAttempt(examId: string, studentId: string) {
  const attempts = await nosqlQuery(EAV2, { examId, studentId });
  return attempts.length > 0 ? attempts[0] : null;
}

export async function getProctoringLogs(attemptId: string) {
  const attempt = (await nosqlGet(EAV2, attemptId)).data as Record<string, unknown> | null;
  if (!attempt) return [];
  return (attempt.proctoringLogs as Array<Record<string, unknown>>) || [];
}
