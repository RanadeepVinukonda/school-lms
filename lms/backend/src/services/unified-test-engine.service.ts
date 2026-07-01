import { randomUUID } from 'crypto';
import { FieldValue, collections } from '../database/adapter';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { fetchConceptQuestions, upsertConceptQuestions } from './concept-questions.service';
import { generateQuestionsForConcept } from './ai-question-generator.service';
import * as gamificationService from './gamification.service';
import { computeLevel, computeComplexityHandled } from './ai-level.service';
import { createBulkNotifications, createNotification } from './notification.service';
import type { Difficulty, StudentLevel } from './ai-level.service';

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

  const conceptRef = collections.textbooks()
    .doc(data.textbookId)
    .collection('chapters')
    .doc(data.chapterId)
    .collection('concepts')
    .doc(data.conceptId);

  const conceptDoc = await conceptRef.get();
  if (!conceptDoc.exists) {
    throw new NotFoundError('Concept not found');
  }
  const conceptData = conceptDoc.data()!;
  const conceptName = conceptData.title || conceptData.name || 'Untitled Concept';

  const selectedModels = data.selectedModels ?? [];
  const questionCount = data.questionCount ?? 0;
  const targetTypes = resolveTypes(selectedModels);
  const typeSet = new Set(targetTypes);

  let matchingQuestions: any[];
  let aiGeneratedCount = 0;
  let aiErrorMessage = '';
  const bankQuestionIds = new Set<string>();

  if (data.questions && data.questions.length > 0) {
    matchingQuestions = data.questions.map((q: any) => ({
      id: q.id || randomUUID(),
      type: q.type || 'mcq',
      text: q.text || q.question || '',
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
        text: q.question,
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
          text: q.question,
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
        id: q.id, type: q.type, text: q.text, options: q.options,
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
      question: q.text ?? q.question,
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
      id: q.id, type: q.type, text: q.text, options: q.options,
      correctAnswer: q.correctAnswer, explanation: q.explanation,
      difficulty: q.difficulty, points: q.points,
    })),
    isRepublished: false,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    createdAt: now,
    updatedAt: now,
  };

  await collections.quizV2().doc(testId).set(testData);

  logger.info('Unified test created', {
    testId,
    testType: data.testType,
    classId: data.classId,
    title: data.title,
    totalQuestions: matchingQuestions.length,
  });

  try {
    const classDoc = await collections.classes().doc(data.classId).get();
    const classData = classDoc.data();

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
      const studentsSnap = await collections.users()
        .where('classIds', 'array-contains', data.classId)
        .get();
      const studentIds = studentsSnap.docs.map((d) => d.id);

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

  const template: TestTemplate = {
    id,
    name: data.name,
    description: data.description,
    teacherId: data.teacherId,
    testType: data.testType,
    selectedModels: data.selectedModels,
    timeLimitMinutes: data.timeLimitMinutes,
    questionCount: data.questionCount,
    passingScore: data.passingScore,
    maxAttempts: data.maxAttempts,
    shuffleQuestions: data.shuffleQuestions,
    showResults: data.showResults,
    createdAt: now,
    updatedAt: now,
  };

  await collections.testTemplates().doc(id).set(template);
  logger.info('Test template created', { templateId: id, name: data.name });
  return template;
}

export async function updateTestTemplate(templateId: string, teacherId: string, data: Partial<TestTemplate>): Promise<TestTemplate> {
  const ref = collections.testTemplates().doc(templateId);
  const doc = await ref.get();

  if (!doc.exists) throw new NotFoundError('Template not found');
  const existing = doc.data() as TestTemplate;
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your template');

  const updates = { ...data, updatedAt: new Date().toISOString() };
  await ref.update(updates);

  const updated = await ref.get();
  return { id: updated.id, ...updated.data() } as TestTemplate;
}

export async function deleteTestTemplate(templateId: string, teacherId: string): Promise<void> {
  const ref = collections.testTemplates().doc(templateId);
  const doc = await ref.get();

  if (!doc.exists) throw new NotFoundError('Template not found');
  const existing = doc.data() as TestTemplate;
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your template');

  await ref.delete();
  logger.info('Test template deleted', { templateId });
}

export async function getTeacherTemplates(teacherId: string): Promise<TestTemplate[]> {
  const snapshot = await collections.testTemplates()
    .where('teacherId', '==', teacherId)
    .get();

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TestTemplate))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTestsForClass(classId: string, role?: string): Promise<UnifiedTest[]> {
  const snapshot = await collections.quizV2()
    .where('classId', '==', classId)
    .get();

  const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UnifiedTest));
  const isPrivileged = role === 'teacher' || role === 'admin' || role === 'super_admin';

  const filtered = isPrivileged ? items : items.filter((t) => !!t.releasedAt);
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTestsForTeacher(teacherId: string): Promise<UnifiedTest[]> {
  const snapshot = await collections.quizV2()
    .where('teacherId', '==', teacherId)
    .get();

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UnifiedTest))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTestById(testId: string): Promise<UnifiedTest> {
  const ref = collections.quizV2().doc(testId);
  const doc = await ref.get();

  if (!doc.exists) throw new NotFoundError('Test not found');
  return { id: doc.id, ...doc.data() } as UnifiedTest;
}

export async function updateTest(testId: string, teacherId: string, data: Partial<UnifiedTest>): Promise<UnifiedTest> {
  const ref = collections.quizV2().doc(testId);
  const doc = await ref.get();

  if (!doc.exists) throw new NotFoundError('Test not found');
  const existing = doc.data() as UnifiedTest;
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your test');

  const allowed = ['title', 'timeLimitMinutes', 'passingScore', 'maxAttempts', 'shuffleQuestions', 'showResults', 'description', 'startDate', 'endDate'];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (data[key as keyof typeof data] !== undefined) {
      updates[key] = data[key as keyof typeof data];
    }
  }

  await ref.update(updates);
  const updated = await ref.get();
  logger.info('Test updated', { testId, teacherId });
  return { id: updated.id, ...updated.data() } as UnifiedTest;
}

export async function deleteTest(testId: string, teacherId: string): Promise<void> {
  const ref = collections.quizV2().doc(testId);
  const doc = await ref.get();

  if (!doc.exists) throw new NotFoundError('Test not found');
  const existing = doc.data() as UnifiedTest;
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your test');

  const attemptsSnap = await collections.quizAttemptV2()
    .where('quizId', '==', testId)
    .get();

  const batch = collections.quizV2().firestore.batch();
  attemptsSnap.docs.forEach((a) => batch.delete(a.ref));
  batch.delete(ref);
  await batch.commit();

  logger.info('Test deleted', { testId, teacherId, attemptsDeleted: attemptsSnap.size });
}

export async function republishTest(testId: string, teacherId: string): Promise<UnifiedTest> {
  const ref = collections.quizV2().doc(testId);
  const doc = await ref.get();

  if (!doc.exists) throw new NotFoundError('Test not found');
  const existing = doc.data() as UnifiedTest;
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your test');

  const now = new Date().toISOString();
  await ref.update({ isRepublished: true, releasedAt: now, updatedAt: now });

  const updated = await ref.get();
  logger.info('Test republished', { testId, teacherId });
  return { id: updated.id, ...updated.data() } as UnifiedTest;
}

export async function startTestAttempt(testId: string, studentId: string): Promise<any> {
  const testRef = collections.quizV2().doc(testId);
  const testDoc = await testRef.get();

  if (!testDoc.exists) throw new NotFoundError('Test not found');
  const testData = testDoc.data() as UnifiedTest;

  if (!testData.releasedAt) throw new ForbiddenError('Test is not yet released');

  if (testData.startDate && new Date() < new Date(testData.startDate)) {
    throw new ForbiddenError('Test has not started yet');
  }
  if (testData.endDate && new Date() > new Date(testData.endDate)) {
    throw new ForbiddenError('Test has already ended');
  }

  if (testData.publishedTo === 'students' && testData.targetStudentIds.length > 0) {
    if (!testData.targetStudentIds.includes(studentId)) {
      throw new ForbiddenError('This test is not assigned to you');
    }
  }

  const attemptsSnapshot = await collections.quizAttemptV2()
    .where('quizId', '==', testId)
    .where('studentId', '==', studentId)
    .get();

  if (attemptsSnapshot.size >= testData.maxAttempts) {
    throw new ForbiddenError('Maximum attempts reached');
  }

  const userDoc = await collections.users().doc(studentId).get();
  const userData = userDoc.data() || {};
  const studentLevel: StudentLevel = (userData.level as StudentLevel) || 'beginner';

  const questionBank = testData.questions || [];
  let available = [...questionBank];

  if (testData.shuffleQuestions !== false) {
    available = [...available].sort(() => Math.random() - 0.5);
  }

  const selected = available.slice(0, Math.min(testData.questionCount || available.length, available.length));

  const questionsForStudent = selected.map((q: any) => {
    if (testData.isRepublished) return q;
    const { correctAnswer, ...rest } = q;
    return rest;
  });

  const attemptId = randomUUID();
  const now = new Date().toISOString();

  const attempt = {
    id: attemptId,
    quizId: testId,
    studentId,
    startedAt: now,
    submittedAt: null,
    answers: [],
    score: null,
    totalPoints: selected.reduce((sum: number, q: any) => sum + (POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1), 0),
    percentage: null,
    passed: null,
    timeSpent: 0,
    status: 'in_progress',
    selectedModels: testData.selectedModels,
    level: studentLevel,
    testType: testData.testType,
  };

  await collections.quizAttemptV2().doc(attemptId).set(attempt);
  await testRef.update({ attemptCount: FieldValue.increment(1) });

  logger.info('Test attempt started', { testId, studentId, attemptId, testType: testData.testType });

  return { ...attempt, questions: questionsForStudent };
}

export async function submitTestAttempt(attemptId: string, studentId: string, data: {
  answers: Array<{ questionId: string; answer: string | string[]; timeSpent?: number }>;
  startedAt: string;
  submittedAt: string;
}): Promise<any> {
  const attemptRef = collections.quizAttemptV2().doc(attemptId);
  const attemptDoc = await attemptRef.get();

  if (!attemptDoc.exists) throw new NotFoundError('Attempt not found');
  const attemptData = attemptDoc.data()!;

  if (attemptData.studentId !== studentId) throw new ForbiddenError('Not your attempt');
  if (attemptData.status !== 'in_progress') throw new ForbiddenError('Attempt already submitted');

  const testRef = collections.quizV2().doc(attemptData.quizId);
  const testDoc = await testRef.get();
  if (!testDoc.exists) throw new NotFoundError('Test not found');
  const testData = testDoc.data() as UnifiedTest;

  const startedAt = new Date(data.startedAt).getTime();
  const submittedAtTime = new Date(data.submittedAt).getTime();
  const elapsedMinutes = (submittedAtTime - startedAt) / 60000;
  if (elapsedMinutes > testData.timeLimitMinutes) {
    throw new ForbiddenError('Time limit exceeded');
  }

  const questionBank = testData.questions || [];

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
      questionId: answer.questionId,
      questionText: question.text,
      answer: answer.answer,
      isCorrect,
      pointsEarned,
      timeSpent: answer.timeSpent || 0,
    };
    if (testData.showResults) {
      graded.correctAnswer = question.correctAnswer;
      graded.explanation = question.explanation;
    }
    return graded;
  });

  const timeSpent = data.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  const percentage = attemptData.totalPoints > 0 ? Math.round((score / attemptData.totalPoints) * 100) : 0;
  const passed = percentage >= (testData.passingScore || 50);

  const accuracy = attemptData.totalPoints > 0 ? score / attemptData.totalPoints : 0;
  const avgReactionTime = gradedAnswers.length > 0
    ? gradedAnswers.reduce((sum: number, a: any) => sum + (a.timeSpent || 0), 0) / gradedAnswers.length
    : 0;

  const difficultyMap: Record<string, Difficulty> = {};
  for (const q of questionBank) {
    difficultyMap[q.id] = q.difficulty || 'easy';
  }

  const complexityHandled = computeComplexityHandled(
    gradedAnswers.map((a: any) => ({ questionId: a.questionId, correct: a.isCorrect })),
    difficultyMap,
  );

  const newLevel = computeLevel(accuracy, avgReactionTime, complexityHandled);

  await collections.users().doc(studentId).update({ level: newLevel });

  const result = {
    answers: gradedAnswers,
    score,
    totalPoints: attemptData.totalPoints,
    percentage,
    passed,
    timeSpent,
    submittedAt: data.submittedAt,
    status: 'completed',
  };

  await attemptRef.update(result);

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
    const studentSnap = await collections.users().doc(studentId).get();
    const studentName = studentSnap.exists ? (studentSnap.data()?.displayName || studentSnap.data()?.email || 'Unknown') : 'Unknown';
    await createNotification({
      userId: testData.teacherId,
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
  const testDoc = await collections.quizV2().doc(testId).get();
  if (!testDoc.exists) throw new NotFoundError('Test not found');

  const testData = testDoc.data() as UnifiedTest;
  const resultsGated = !testData.showResults;

  let query = collections.quizAttemptV2()
    .where('quizId', '==', testId);
  if (!isPrivileged) {
    query = query.where('studentId', '==', studentId);
  }

  const snapshot = await query.get();
  const attempts = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  const sorted = attempts.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  // Fetch student names for privileged users
  const studentNames = new Map<string, string>();
  if (isPrivileged) {
    const studentIds = [...new Set(sorted.map((a: any) => a.studentId))] as string[];
    for (const sid of studentIds) {
      try {
        const userSnap = await collections.users().doc(sid).get();
        if (userSnap.exists) {
          const userData = userSnap.data()!;
          studentNames.set(sid, userData.displayName || userData.email || 'Unknown');
        }
      } catch { studentNames.set(sid, 'Unknown'); }
    }
  }

  return sorted.map((data: any) => {
    const enriched = { ...data, studentName: studentNames.get(data.studentId) || null };
    if (!isPrivileged && resultsGated && data.status === 'completed') {
      return {
        id: data.id,
        quizId: data.quizId,
        studentId: data.studentId,
        studentName: null,
        testType: data.testType,
        score: data.score,
        totalPoints: data.totalPoints,
        percentage: data.percentage,
        passed: data.passed,
        timeSpent: data.timeSpent,
        startedAt: data.startedAt,
        submittedAt: data.submittedAt,
        status: data.status,
        level: data.level,
        answers: data.answers?.map((a: { questionId: string; pointsEarned: number }) => ({
          questionId: a.questionId,
          pointsEarned: a.pointsEarned,
        })) ?? [],
      };
    }
    return enriched;
  });
}

export async function getTestAttemptsForStudent(studentId: string): Promise<any[]> {
  const snapshot = await collections.quizAttemptV2()
    .where('studentId', '==', studentId)
    .get();

  const attempts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const testIds = [...new Set(attempts.map((a: any) => a.quizId))] as string[];

  const testTitles = new Map<string, string>();
  const subjectNames = new Map<string, string>();
  const subjectIds = new Map<string, string>();
  for (const tid of testIds) {
    try {
      const testSnap = await collections.quizV2().doc(tid).get();
      if (testSnap.exists) {
        const testData = testSnap.data()!;
        testTitles.set(tid, testData.title || 'Untitled');
        subjectNames.set(tid, testData.subjectName || testData.subjectId || 'Unknown');
        subjectIds.set(tid, testData.subjectId || '');
      }
    } catch { /* ignore */ }
  }

  return attempts.map((a: any) => ({
    ...a,
    testTitle: testTitles.get(a.quizId) || 'Untitled',
    subjectName: subjectNames.get(a.quizId) || 'Unknown',
    subjectId: subjectIds.get(a.quizId) || '',
  })).sort((a: any, b: any) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime());
}

export async function getClassAttempts(classId: string): Promise<any[]> {
  const testsSnap = await collections.quizV2().where('classId', '==', classId).get();
  const testIds = testsSnap.docs.map((d) => d.id);
  const testTitles = new Map(testsSnap.docs.map((d) => [d.id, d.data().title || 'Untitled']));

  if (testIds.length === 0) return [];

  const allAttempts: any[] = [];
  for (const testId of testIds) {
    const snap = await collections.quizAttemptV2().where('quizId', '==', testId).get();
    for (const doc of snap.docs) {
      const data = doc.data();
      allAttempts.push({
        id: doc.id,
        ...data,
        testTitle: testTitles.get(testId) || 'Untitled',
      });
    }
  }

  const studentIds = [...new Set(allAttempts.map((a) => a.studentId))] as string[];
  const studentNames = new Map<string, string>();
  for (const sid of studentIds) {
    try {
      const userSnap = await collections.users().doc(sid).get();
      if (userSnap.exists) {
        const userData = userSnap.data()!;
        studentNames.set(sid, userData.displayName || userData.email || 'Unknown');
      }
    } catch { studentNames.set(sid, 'Unknown'); }
  }

  return allAttempts.map((a) => ({
    ...a,
    studentName: studentNames.get(a.studentId) || null,
  })).sort((a, b) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime());
}

export async function releaseResults(testId: string, showResults: boolean, teacherId?: string): Promise<UnifiedTest> {
  const ref = collections.quizV2().doc(testId);
  const doc = await ref.get();

  if (!doc.exists) throw new NotFoundError('Test not found');
  const existing = doc.data() as UnifiedTest;
  if (teacherId && existing.teacherId !== teacherId) throw new ForbiddenError('Not your test');

  await ref.update({ showResults, updatedAt: new Date().toISOString() });
  logger.info('Test results release toggled', { testId, showResults });

  const updated = await ref.get();
  return { id: updated.id, ...updated.data() } as UnifiedTest;
}
