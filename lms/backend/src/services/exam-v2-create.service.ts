import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { generateQuestionsForConcept, saveAiQuestions } from './ai-question-generator.service';
import { createBulkNotifications } from './notification.service';
import { nosqlSet, nosqlGet, nosqlUpdate } from './nosql.service';

const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
const EV2 = 'examV2';

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
  publishedTo?: string;
  targetStudentIds?: string[];
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
  let aiGeneratedCount = 0;

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

      const shortfall = perConcept - selected.length;
      if (shortfall > 0 && remaining > 0) {
        const needed = Math.min(shortfall, remaining);
        try {
          const aiQuestions = await generateQuestionsForConcept({
            conceptId: c.id,
            textbookId: data.textbookId,
            chapterId: data.chapterId,
            conceptName: c.title || 'Untitled Concept',
            types: data.selectedModels,
            count: needed,
            difficulty: 'mixed',
          });
          if (aiQuestions.length > 0) {
            aiGeneratedCount += aiQuestions.length;
            remaining -= aiQuestions.length;
            for (const q of aiQuestions) {
              const pts = q.points || POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1;
              allSelectedQuestions.push({
                id: q.id,
                type: q.type,
                text: q.question,
                options: q.options || null,
                correctAnswer: q.answer,
                explanation: q.explanation || '',
                difficulty: q.difficulty || 'medium',
                points: pts,
                conceptId: c.id,
                aiGenerated: true,
              });
              totalPoints += pts;
            }
          }
        } catch (err) {
          logger.error('AI question generation failed for concept', { conceptId: c.id, error: err });
        }
      }
    }
  }

  if (data.preview) {
    return {
      questions: allSelectedQuestions,
      totalPoints,
      questionCount: allSelectedQuestions.length,
      aiGeneratedCount,
      preview: true,
    };
  }

  const examId = uuidv4();
  const now = new Date().toISOString();

  // Strip correctAnswer from questions for storage (students get questions, not answers)
  const questionsForStorage = allSelectedQuestions.map((q: any) => ({
    id: q.id,
    type: q.type,
    text: q.text,
    options: q.options || null,
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
    difficulty: q.difficulty || 'medium',
    points: q.points || POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1,
    conceptId: q.conceptId || '',
  }));

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
    aiGeneratedCount,
    totalPoints,
    questions: questionsForStorage,
    passingScore: data.passingScore ?? 50,
    maxAttempts: data.maxAttempts ?? 1,
    shuffleQuestions: data.shuffleQuestions ?? true,
    showResults: data.showResults ?? false,
    attemptCount: 0,
    releasedAt: null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    schoolId: data.schoolId || '',
    publishedTo: data.publishedTo || 'class',
    targetStudentIds: data.targetStudentIds || [],
    createdAt: now,
    updatedAt: now,
  };

  await nosqlSet(EV2, examId, examData);

  if (aiGeneratedCount > 0) {
    const byConcept = new Map<string, any[]>();
    for (const q of allSelectedQuestions) {
      if ((q as any).aiGenerated) {
        const cid = (q as any).conceptId as string;
        if (!byConcept.has(cid)) byConcept.set(cid, []);
        byConcept.get(cid)?.push(q);
      }
    }
    for (const [cid, questions] of byConcept) {
      try {
        await saveAiQuestions(questions as any, cid, data.textbookId, data.chapterId);
      } catch (saveErr) {
        logger.warn('Failed to save AI-generated questions to bank', { conceptId: cid, count: questions.length, error: saveErr });
      }
    }
  }

  logger.info('Exam V2 created', { examId, classId: data.classId, title: data.title });

  return examData;
}

export async function releaseExam(examId: string, teacherId: string) {
  const { exists, data: examData } = await nosqlGet(EV2, examId);
  if (!exists || !examData) throw new NotFoundError('Exam not found');
  if (examData.teacherId !== teacherId) throw new ForbiddenError('You do not own this exam');

  const now = new Date().toISOString();
  await nosqlUpdate(EV2, examId, { releasedAt: now, updatedAt: now });

  try {
    const examTitle = (examData.title as string) || 'Untitled Exam';
    const publishedTo = (examData.publishedTo as string) || 'class';
    const targetStudentIds = (examData.targetStudentIds as string[]) || [];

    if (publishedTo === 'students' && targetStudentIds.length > 0) {
      const studentNotifs = targetStudentIds.map((sid: string) => ({
        userId: sid, type: 'exam', title: 'New Exam Assigned',
        body: `Your teacher assigned Exam: ${examTitle}.`,
      }));
      await createBulkNotifications(studentNotifs);
    } else if (publishedTo === 'class' && examData.classId) {
      const supabase = getSupabaseAdmin()!;
      const { data: students } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'student')
        .contains('class_ids', [(examData.classId as string)]);
      if (students && students.length > 0) {
        const studentNotifs = students.map((s: any) => ({
          userId: s.id, type: 'exam', title: 'New Exam Assigned',
          body: `Your teacher assigned Exam: ${examTitle}.`,
        }));
        await createBulkNotifications(studentNotifs);
      }
    }
  } catch (err) {
    logger.warn('Failed to send exam release notifications', { examId, error: err });
  }

  const updated = await nosqlGet(EV2, examId);
  logger.info('Exam V2 released', { examId, teacherId });
  return { id: examId, ...updated.data };
}
