import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { fetchConceptQuestions, upsertConceptQuestions } from './concept-questions.service';
import { generateQuestionsForConcept } from './ai-question-generator.service';
import { createBulkNotifications } from './notification.service';
import { nosqlSet } from './nosql.service';
import type { TestType, QuestionType, UnifiedTest, PublishTarget } from './unified-test-engine.service';

const QV2 = 'quizV2';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function resolveTypes(selectedModels: string[], typeMap: Record<string, string[]>): string[] {
  return selectedModels.flatMap((m) => typeMap[m] || [m]);
}

function fallbackText(type: string, _options: any): string {
  if (type === 'mcq' || type === 'multiple_choice') return 'Choose the correct answer';
  if (type === 'true_false') return 'State whether true or false';
  if (type === 'fill_blank') return 'Fill in the blank';
  if (type === 'matching') return 'Match the following items';
  if (type === 'numerical') return 'Calculate the answer';
  return 'Answer the following question';
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
  typeMap: Record<string, string[]>;
}): Promise<any> {
  const assignment = await getTeacherAssignment(data.teacherId, data.classId);
  if (!assignment) {
    throw new ForbiddenError('You are not assigned to this class');
  }

  const { data: conceptData } = await getSupabaseAdmin().from('concepts').select('title, name').eq('id', data.conceptId).maybeSingle();
  if (!conceptData) {
    throw new NotFoundError('Concept not found');
  }
  const conceptName = conceptData.title || conceptData.name || 'Untitled Concept';

  const selectedModels = data.selectedModels ?? [];
  const questionCount = data.questionCount ?? 0;
  const targetTypes = resolveTypes(selectedModels, data.typeMap);
  const typeSet = new Set(targetTypes);

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
    const supabase2 = getSupabaseAdmin();
    const { data: classData } = await supabase2.from('classes').select('name').eq('id', data.classId).maybeSingle();

    if (data.publishedTo === 'students' && (data.targetStudentIds ?? []).length > 0) {
      const studentIds = data.targetStudentIds ?? [];
      await createBulkNotifications(
        studentIds.map((studentId) => ({
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
