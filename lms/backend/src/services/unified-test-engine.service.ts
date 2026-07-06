import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { fetchConceptQuestions, upsertConceptQuestions } from './concept-questions.service';
import { generateQuestionsForConcept } from './ai-question-generator.service';
import * as gamificationService from './gamification.service';
import { computeLevel, computeComplexityHandled } from './ai-level.service';
import { createBulkNotifications, createNotification } from './notification.service';
import type { Difficulty, StudentLevel } from './ai-level.service';

const QV2 = 'quizV2';
const QAV2 = 'quizAttemptV2';
const TMPL = 'testTemplates';

export type TestType = 'quiz' | 'assignment' | 'exam';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'matching' | 'descriptive' | 'numerical' | 'passage' | 'assertion_reason' | 'case_study' | 'application_based' | 'hots';
export type TestStatus = 'draft' | 'released';
export type PublishTarget = 'class' | 'students';

export interface TestTemplate {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
  testType: TestType;
  selectedModels: QuestionType[];
  timeLimitMinutes: number;
  questionCount: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedTest {
  id: string;
  title: string;
  description: string;
  testType: TestType;
  classId: string;
  subjectId: string | null;
  textbookId: string;
  chapterId: string;
  conceptId: string;
  teacherId: string;
  templateId: string | null;
  timeLimitMinutes: number;
  selectedModels: QuestionType[];
  questionCount: number;
  totalPoints: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  attemptCount: number;
  status: TestStatus;
  releasedAt: string | null;
  publishedTo: PublishTarget;
  targetStudentIds: string[];
  questions: any[];
  isRepublished: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_MAP: Record<string, string[]> = {
  multiple_choice: ['mcq', 'multiple_choice'],
  true_false: ['true_false'],
  fill_blank: ['fill_blank'],
  short_answer: ['short_answer'],
  matching: ['matching'],
  descriptive: ['descriptive'],
  numerical: ['numerical'],
  passage: ['passage'],
  assertion_reason: ['assertion_reason'],
  case_study: ['case_study'],
  application_based: ['application_based'],
  hots: ['hots'],
};

async function nosqlGet(col: string, id: string) {
  const { data: row } = await getSupabaseAdmin()!.from('nosql_docs').select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  return { exists: !!row, data: (row?.data as Record<string, unknown>) ?? null };
}

async function nosqlSet(col: string, id: string, data: Record<string, unknown>) {
  const { error } = await getSupabaseAdmin()!.from('nosql_docs').upsert({
    collection: col, doc_id: id, data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
}

async function nosqlUpdate(col: string, id: string, updates: Record<string, unknown>) {
  const { data: existing } = await getSupabaseAdmin()!.from('nosql_docs').select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  const merged = { ...((existing?.data as Record<string, unknown>) || {}), ...updates };
  const { error } = await getSupabaseAdmin()!.from('nosql_docs').upsert({
    collection: col, doc_id: id, data: merged,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
}

async function nosqlDelete(col: string, id: string) {
  const { error } = await getSupabaseAdmin()!.from('nosql_docs').delete().eq('collection', col).eq('doc_id', id);
  if (error) throw error;
}

async function nosqlQuery(col: string, filters: Record<string, unknown>) {
  let q: any = getSupabaseAdmin()!.from('nosql_docs').select('doc_id, data').eq('collection', col);
  for (const [k, v] of Object.entries(filters)) {
    q = q.contains('data', { [k]: v });
  }
  const { data: rows, error } = await q;
  if (error) throw error;
  return (rows || []).map((r: { doc_id: string; data: unknown }) => ({ id: r.doc_id, ...(r.data as object) }));
}

const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function resolveTypes(selectedModels: string[]): string[] {
  return selectedModels.flatMap((m) => TYPE_MAP[m] || [m]);
}

export async function createTest(data: {
  title: string;
  description?: string;
  testType: TestType;
  classId: string;
  subjectId?: string;
  textbookId: string;
  chapterId: string;
  conceptId: string;
  teacherId: string;
  templateId?: string;
  timeLimitMinutes: number;
  selectedModels: QuestionType[];
  questionCount: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  publishedTo?: PublishTarget;
  targetStudentIds?: string[];
  startDate?: string;
  endDate?: string;
  questions?: any[];
  preview?: boolean;
}): Promise<any> {
  const assignment = await getTeacherAssignment(data.teacherId, data.classId);
  if (!assignment) {
    throw new ForbiddenError('You are not assigned to this class');
  }

  const { data: conceptData } = await getSupabaseAdmin()!.from('concepts').select('title, name').eq('id', data.conceptId).maybeSingle();
  if (!conceptData) {
    throw new NotFoundError('Concept not found');
  }
  const conceptName = conceptData.title || conceptData.name || 'Untitled Concept';

  const selectedModels = data.selectedModels ?? [];
  const questionCount = data.questionCount ?? 0;
  const targetTypes = resolveTypes(selectedModels);
  const typeSet = new Set(targetTypes);

  function fallbackText(type: string, _options: any): string {
    if (type === 'mcq' || type === 'multiple_choice') return 'Choose the correct answer';
    if (type === 'true_false') return 'State whether true or false';
    if (type === 'fill_blank') return 'Fill in the blank';
    if (type === 'matching') return 'Match the following items';
    if (type === 'numerical') return 'Calculate the answer';
    return 'Answer the following question';
  }

  let matchingQuestions: any[];
  let aiGeneratedCount = 0;
  let aiErrorMessage = '';
  const bankQuestionIds = new Set<string>();

  if (data.questions && data.questions.length > 0) {
    matchingQuestions = data.questions.map((q: any) => ({
      id: q.id || randomUUID(),
      type: q.type || 'mcq',
      text: q.text || q.question || fallbackText(q.type, q.options),
      options: q.options || null,
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      points: q.points || 2,
    }));
  } else {
    const questionBank = await fetchConceptQuestions(data.textbookId, data.chapterId, data.conceptId);

    matchingQuestions = questionBank
    .filter((q: any) => typeSet.size === 0 || typeSet.has(q.type))
    .map((q: any) => {
      if (q.id) bankQuestionIds.add(q.id);
      return {
        id: q.id,
        type: q.type,
        text: q.question || fallbackText(q.type, q.options),
        options: q.options,
        correctAnswer: q.correctAnswer || q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        points: q.points ?? 2,
      };
    });

    if (questionCount > 0 && matchingQuestions.length < questionCount) {
      const needed = questionCount - matchingQuestions.length;
      logger.info('Generating additional questions via AI for unified test', { conceptName, needed, existing: matchingQuestions.length });

      const aiQuestions = await generateQuestionsForConcept({
        conceptId: data.conceptId,
        textbookId: data.textbookId,
        chapterId: data.chapterId,
        conceptName,
        types: selectedModels,
        count: needed,
      });

      for (const q of aiQuestions) {
        matchingQuestions.push({
          id: q.id,
          type: q.type,
          text: q.question || fallbackText(q.type, q.options),
          options: q.options,
          correctAnswer: q.answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          points: q.points,
        });
        aiGeneratedCount++;
      }
    }
  }

  // Trim to requested questionCount if there are more than needed
  if (questionCount > 0 && matchingQuestions.length > questionCount) {
    matchingQuestions = shuffleArray(matchingQuestions).slice(0, questionCount);
  }

  const now = new Date().toISOString();

  if (data.preview) {
    return {
      preview: true,
      testType: data.testType,
      questionCount: matchingQuestions.length,
      totalPoints: matchingQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0),
      questions: matchingQuestions.map((q: any) => ({
        id: q.id, type: q.type, text: q.text || fallbackText(q.type, q.options), options: q.options,
        correctAnswer: q.correctAnswer, explanation: q.explanation,
        difficulty: q.difficulty, points: q.points,
      })),
      existingCount: matchingQuestions.length - aiGeneratedCount,
      aiGeneratedCount,
      aiErrorMessage: aiErrorMessage || undefined,
    };
  }

  const newRows = matchingQuestions
    .filter((q: any) => !bankQuestionIds.has(q.id))
    .map((q: any) => ({
      id: q.id,
      concept_id: data.conceptId,
      textbook_id: data.textbookId,
      chapter_id: data.chapterId,
      question: q.text ?? q.question ?? fallbackText(q.type, q.options),
      type: q.type,
      difficulty: q.difficulty,
      options: q.options,
      answer: q.correctAnswer ?? q.answer,
      explanation: q.explanation,
      points: q.points ?? 2,
      created_at: now,
      updated_at: now,
    }));

  if (newRows.length > 0) {
    await upsertConceptQuestions(newRows);
    logger.info('Questions saved to question bank from unified test', {
      conceptId: data.conceptId,
      count: newRows.length,
    });
  }

  const totalPoints = matchingQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
  const testId = randomUUID();

  const maxAttempts = data.testType === 'exam' ? (data.maxAttempts ?? 1) : (data.maxAttempts ?? 3);

  const testData: UnifiedTest = {
    id: testId,
    title: data.title,
    description: data.description || '',
    testType: data.testType,
    classId: data.classId,
    subjectId: data.subjectId || null,
    textbookId: data.textbookId,
    chapterId: data.chapterId,
    conceptId: data.conceptId,
    teacherId: data.teacherId,
    templateId: data.templateId || null,
    timeLimitMinutes: data.timeLimitMinutes,
    selectedModels,
    questionCount,
    totalPoints,
    passingScore: data.passingScore ?? 50,
    maxAttempts,
    shuffleQuestions: data.shuffleQuestions ?? true,
    showResults: data.showResults ?? false,
    attemptCount: 0,
    status: 'released',
    releasedAt: now,
    publishedTo: data.publishedTo || 'class',
    targetStudentIds: data.targetStudentIds || [],
    questions: matchingQuestions.map((q: any) => ({
      id: q.id, type: q.type, text: q.text || fallbackText(q.type, q.options), options: q.options,
      correctAnswer: q.correctAnswer, explanation: q.explanation,
      difficulty: q.difficulty, points: q.points,
    })),
    isRepublished: false,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    createdAt: now,
    updatedAt: now,
  };

  await nosqlSet(QV2, testId, testData as unknown as Record<string, unknown>);

  logger.info('Unified test created', {
    testId,
    testType: data.testType,
    classId: data.classId,
    title: data.title,
    totalQuestions: matchingQuestions.length,
  });

  try {
    const supabase2 = getSupabaseAdmin()!;
    const { data: classData } = await supabase2.from('classes').select('name').eq('id', data.classId).maybeSingle();

    if (data.publishedTo === 'students' && (data.targetStudentIds ?? []).length > 0) {
      await createBulkNotifications(
        data.targetStudentIds!.map((studentId) => ({
          userId: studentId,
          type: 'test_published',
          title: `New ${data.testType}: ${data.title}`,
          body: `A new ${data.testType} "${data.title}" has been published${classData ? ` for ${classData.name || ''}` : ''}.`,
          data: { testId, testType: data.testType, classId: data.classId, conceptId: data.conceptId },
        }))
      );
    } else if (data.publishedTo === 'class') {
      const { data: studentRows } = await supabase2.from('users').select('id').contains('class_ids', [data.classId]);
      const studentIds = (studentRows || []).map((r) => r.id);

      if (studentIds.length > 0) {
        await createBulkNotifications(
          studentIds.map((studentId) => ({
            userId: studentId,
            type: 'test_published',
            title: `New ${data.testType}: ${data.title}`,
            body: `A new ${data.testType} "${data.title}" has been published${classData ? ` for ${classData.name || ''}` : ''}.`,
            data: { testId, testType: data.testType, classId: data.classId, conceptId: data.conceptId },
          }))
        );
      }
    }
  } catch (notifErr) {
    logger.error('Failed to send test published notifications', { testId, error: notifErr });
  }

  return testData;
}

export async function createTestTemplate(data: {
  name: string;
  description?: string;
  teacherId: string;
  testType: TestType;
  selectedModels: QuestionType[];
  timeLimitMinutes: number;
  questionCount: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResults: boolean;
}): Promise<TestTemplate> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const template: Record<string, unknown> = {
    id, name: data.name, description: data.description,
    teacherId: data.teacherId, testType: data.testType,
    selectedModels: data.selectedModels, timeLimitMinutes: data.timeLimitMinutes,
    questionCount: data.questionCount, passingScore: data.passingScore,
    maxAttempts: data.maxAttempts, shuffleQuestions: data.shuffleQuestions,
    showResults: data.showResults, createdAt: now, updatedAt: now,
  };

  await nosqlSet(TMPL, id, template);
  logger.info('Test template created', { templateId: id, name: data.name });
  return template as unknown as TestTemplate;
}

export async function updateTestTemplate(templateId: string, teacherId: string, data: Partial<TestTemplate>): Promise<TestTemplate> {
  const { exists, data: existing } = await nosqlGet(TMPL, templateId);
  if (!exists || !existing) throw new NotFoundError('Template not found');
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your template');

  const updates = { ...data, updatedAt: new Date().toISOString() };
  await nosqlUpdate(TMPL, templateId, updates as unknown as Record<string, unknown>);
  const updated = await nosqlGet(TMPL, templateId);
  return { id: templateId, ...updated.data } as unknown as TestTemplate;
}

export async function deleteTestTemplate(templateId: string, teacherId: string): Promise<void> {
  const { exists, data: existing } = await nosqlGet(TMPL, templateId);
  if (!exists || !existing) throw new NotFoundError('Template not found');
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your template');
  await nosqlDelete(TMPL, templateId);
  logger.info('Test template deleted', { templateId });
}

export async function getTeacherTemplates(teacherId: string): Promise<TestTemplate[]> {
  const items = await nosqlQuery(TMPL, { teacherId });
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as unknown as TestTemplate[];
}

export async function getTestsForClass(classId: string, role?: string): Promise<UnifiedTest[]> {
  const items = await nosqlQuery(QV2, { classId });
  const isPrivileged = role === 'teacher' || role === 'admin' || role === 'super_admin';

  const filtered = isPrivileged ? items : items.filter((t: any) => !!t.releasedAt);
  return filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as unknown as UnifiedTest[];
}

export async function getTestsForTeacher(teacherId: string): Promise<UnifiedTest[]> {
  const items = await nosqlQuery(QV2, { teacherId });
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as unknown as UnifiedTest[];
}

export async function getTestById(testId: string): Promise<UnifiedTest> {
  const { exists, data } = await nosqlGet(QV2, testId);
  if (!exists || !data) throw new NotFoundError('Test not found');
  return { id: testId, ...data } as unknown as UnifiedTest;
}

export async function updateTest(testId: string, teacherId: string, data: Partial<UnifiedTest>): Promise<UnifiedTest> {
  const { exists, data: existing } = await nosqlGet(QV2, testId);
  if (!exists || !existing) throw new NotFoundError('Test not found');
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your test');

  const allowed = ['title', 'timeLimitMinutes', 'passingScore', 'maxAttempts', 'shuffleQuestions', 'showResults', 'description', 'startDate', 'endDate'];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (data[key as keyof typeof data] !== undefined) updates[key] = data[key as keyof typeof data];
  }

  await nosqlUpdate(QV2, testId, updates);
  const updated = await nosqlGet(QV2, testId);
  logger.info('Test updated', { testId, teacherId });
  return { id: testId, ...updated.data } as unknown as UnifiedTest;
}

export async function deleteTest(testId: string, teacherId: string): Promise<void> {
  const { exists, data: existing } = await nosqlGet(QV2, testId);
  if (!exists || !existing) throw new NotFoundError('Test not found');
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your test');

  const attempts = await nosqlQuery(QAV2, { quizId: testId });
  for (const a of attempts) {
    await nosqlDelete(QAV2, (a as any).id);
  }
  await nosqlDelete(QV2, testId);

  logger.info('Test deleted', { testId, teacherId, attemptsDeleted: attempts.length });
}

export async function republishTest(testId: string, teacherId: string): Promise<UnifiedTest> {
  const { exists, data: existing } = await nosqlGet(QV2, testId);
  if (!exists || !existing) throw new NotFoundError('Test not found');
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your test');

  const now = new Date().toISOString();
  await nosqlUpdate(QV2, testId, { isRepublished: true, releasedAt: now, updatedAt: now });
  const updated = await nosqlGet(QV2, testId);
  logger.info('Test republished', { testId, teacherId });
  return { id: testId, ...updated.data } as unknown as UnifiedTest;
}

export async function startTestAttempt(testId: string, studentId: string): Promise<any> {
  const supabase = getSupabaseAdmin()!;
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

  const { data: userRow } = await supabase.from('users').select('level').eq('id', studentId).maybeSingle();
  const studentLevel: StudentLevel = ((userRow?.level as StudentLevel) || 'beginner');

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
  startedAt: string;
  submittedAt: string;
}): Promise<any> {
  const supabase = getSupabaseAdmin()!;
  const attemptData = (await nosqlGet(QAV2, attemptId)).data as Record<string, unknown> | null;
  if (!attemptData) throw new NotFoundError('Attempt not found');
  if (attemptData.studentId !== studentId) throw new ForbiddenError('Not your attempt');
  if (attemptData.status !== 'in_progress') throw new ForbiddenError('Attempt already submitted');

  const testData = (await nosqlGet(QV2, attemptData.quizId as string)).data as Record<string, unknown> | null;
  if (!testData) throw new NotFoundError('Test not found');

  const startedAtMs = new Date(data.startedAt).getTime();
  const submittedAtMs = new Date(data.submittedAt).getTime();
  const elapsedMinutes = (submittedAtMs - startedAtMs) / 60000;
  if (elapsedMinutes > (testData.timeLimitMinutes as number)) throw new ForbiddenError('Time limit exceeded');

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

  const { error: levelUpdateErr } = await supabase.from('users').update({ level: newLevel }).eq('id', studentId);
  if (levelUpdateErr) throw new Error(`Failed to update user level: ${levelUpdateErr.message}`);

  const result: Record<string, unknown> = {
    answers: gradedAnswers, score, totalPoints, percentage, passed,
    timeSpent, submittedAt: data.submittedAt, status: 'completed',
  };
  await nosqlUpdate(QAV2, attemptId, result);

  logger.info('Test attempt submitted', { attemptId, studentId, score, percentage, newLevel });

  try {
    await gamificationService.recordAssessmentResult(studentId, percentage);
    await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.assessmentComplete, `Completed test: ${testData.title}`);
    await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.assessmentComplete, `Completed test: ${testData.title}`);
    if (percentage >= 80) {
      await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${testData.title}`);
      await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${testData.title}`);
    }
    if (percentage === 100) {
      await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.perfectScore, `Perfect score on ${testData.title}`);
      await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.perfectScore, `Perfect score on ${testData.title}`);
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

  return { id: attemptId, ...attemptData, ...result, level: newLevel };
}

export async function getTestResults(testId: string, studentId: string, isPrivileged = false): Promise<any[]> {
  const nq = await nosqlGet(QV2, testId);
  const testData = nq.data as Record<string, unknown> | null;
  if (!testData) throw new NotFoundError('Test not found');

  const resultsGated = !(testData.showResults as boolean);
  const attempts = await (isPrivileged ? nosqlQuery(QAV2, { quizId: testId }) : nosqlQuery(QAV2, { quizId: testId, studentId }));
  const sorted = attempts.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const studentNames = new Map<string, string>();
  if (isPrivileged) {
    const studentIds = [...new Set(sorted.map((a: any) => a.studentId))] as string[];
    const { data: rows } = await getSupabaseAdmin()!.from('users').select('id, display_name, email').in('id', studentIds);
    if (rows) { for (const r of rows) studentNames.set(r.id, r.display_name || r.email || 'Unknown'); }
  }

  return sorted.map((data: any) => {
    const enriched = { ...data, studentName: studentNames.get(data.studentId) || null };
    if (!isPrivileged && resultsGated && data.status === 'completed') {
      return {
        id: data.id, quizId: data.quizId, studentId: data.studentId, studentName: null,
        testType: data.testType, score: data.score, totalPoints: data.totalPoints,
        percentage: data.percentage, passed: data.passed, timeSpent: data.timeSpent,
        startedAt: data.startedAt, submittedAt: data.submittedAt, status: data.status,
        level: data.level,
        answers: (data.answers || []).map((a: { questionId: string; pointsEarned: number }) => ({ questionId: a.questionId, pointsEarned: a.pointsEarned })),
      };
    }
    return enriched;
  });
}

export async function getTestAttemptsForStudent(studentId: string): Promise<any[]> {
  const attempts = await nosqlQuery(QAV2, { studentId });
  const testIds = [...new Set(attempts.map((a: any) => a.quizId))] as string[];

  const testMeta = new Map<string, { title: string; subjectName: string; subjectId: string }>();
  for (const tid of testIds) {
    const nq2 = await nosqlGet(QV2, tid);
    const data = nq2.data as Record<string, unknown> | null;
    if (data) {
      const d = data as any;
      testMeta.set(tid, { title: d.title || 'Untitled', subjectName: d.subjectName || d.subjectId || 'Unknown', subjectId: d.subjectId || '' });
    }
  }

  return attempts.map((a: any) => {
    const meta = testMeta.get(a.quizId) || { title: 'Untitled', subjectName: 'Unknown', subjectId: '' };
    return { ...a, testTitle: meta.title, subjectName: meta.subjectName, subjectId: meta.subjectId };
  }).sort((a: any, b: any) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime());
}

export async function getClassAttempts(classId: string): Promise<any[]> {
  const items = await nosqlQuery(QV2, { classId });
  const testTitles = new Map(items.map((t: any) => [t.id, t.title || 'Untitled']));
  const testIds = items.map((t: any) => t.id);

  if (testIds.length === 0) return [];

  const allAttempts: any[] = [];
  for (const testId of testIds) {
    const attempts = await nosqlQuery(QAV2, { quizId: testId });
    for (const a of attempts) {
      allAttempts.push({ ...a, testTitle: testTitles.get(testId) || 'Untitled' });
    }
  }

  const studentIds = [...new Set(allAttempts.map((a: any) => a.studentId))] as string[];
  const { data: rows } = await getSupabaseAdmin()!.from('users').select('id, display_name, email').in('id', studentIds);
  const studentNames = new Map<string, string>();
  if (rows) { for (const r of rows) studentNames.set(r.id, r.display_name || r.email || 'Unknown'); }

  return allAttempts.map((a: any) => ({
    ...a, studentName: studentNames.get(a.studentId) || null,
  })).sort((a: any, b: any) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime());
}

export async function releaseResults(testId: string, showResults: boolean, teacherId?: string): Promise<UnifiedTest> {
  const { exists, data: existing } = await nosqlGet(QV2, testId);
  if (!exists || !existing) throw new NotFoundError('Test not found');
  if (teacherId && existing.teacherId !== teacherId) throw new ForbiddenError('Not your test');

  await nosqlUpdate(QV2, testId, { showResults, updatedAt: new Date().toISOString() });
  logger.info('Test results release toggled', { testId, showResults });
  const updated = await nosqlGet(QV2, testId);
  return { id: testId, ...updated.data } as unknown as UnifiedTest;
}
