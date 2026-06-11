import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

interface CreateQuestionData {
  text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'matching' | 'essay';
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
  tags?: string[];
  classId: string;
  subjectId: string;
  chapterId?: string;
  conceptId?: string;
  isPreviousYear?: boolean;
  year?: string;
}

export async function createQuestion(data: CreateQuestionData & { createdBy: string }) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const questionData = {
    id,
    ...data,
    tags: data.tags || [],
    isPreviousYear: data.isPreviousYear ?? false,
    year: data.year || null,
    chapterId: data.chapterId || null,
    conceptId: data.conceptId || null,
    explanation: data.explanation || null,
    createdAt: now,
    updatedAt: now,
  };

  await collections.questionBank().doc(id).set(questionData);
  logger.info('Question created', { id, type: data.type, difficulty: data.difficulty });
  return questionData;
}

export async function bulkCreateQuestions(questions: CreateQuestionData[], createdBy: string) {
  const batch = collections.questionBank().firestore.batch();
  const now = new Date().toISOString();
  const results: any[] = [];

  for (const q of questions) {
    const id = uuidv4();
    const data = {
      id, ...q,
      tags: q.tags || [],
      isPreviousYear: q.isPreviousYear ?? false,
      year: q.year || null,
      chapterId: q.chapterId || null,
      conceptId: q.conceptId || null,
      explanation: q.explanation || null,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(collections.questionBank().doc(id), data);
    results.push(data);
  }

  await batch.commit();
  logger.info('Bulk questions created', { count: questions.length, createdBy });
  return results;
}

export async function updateQuestion(id: string, userId: string, data: Partial<CreateQuestionData>) {
  const ref = collections.questionBank().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Question not found');

  const existing = doc.data()!;
  if (existing.createdBy !== userId) throw new ForbiddenError('You can only edit your own questions');

  const updates: any = { ...data, updatedAt: new Date().toISOString() };
  Object.keys(updates).forEach((k) => { if (updates[k] === undefined) delete updates[k]; });

  await ref.update(updates);
  const updated = await ref.get();
  return { ...updated.data() };
}

export async function deleteQuestion(id: string, userId: string) {
  const ref = collections.questionBank().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Question not found');
  if (doc.data()!.createdBy !== userId) throw new ForbiddenError('You can only delete your own questions');
  await ref.delete();
  logger.info('Question deleted', { id });
}

export async function getQuestion(id: string) {
  const ref = collections.questionBank().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Question not found');
  return { ...doc.data() };
}

export async function listQuestions(params: {
  classId?: string;
  subjectId?: string;
  type?: string;
  difficulty?: string;
  isPreviousYear?: boolean;
  year?: string;
  createdBy?: string;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}) {
  let query: FirebaseFirestore.Query = collections.questionBank()
    .orderBy('createdAt', 'desc');

  if (params.classId) query = query.where('classId', '==', params.classId);
  if (params.subjectId) query = query.where('subjectId', '==', params.subjectId);
  if (params.type) query = query.where('type', '==', params.type);
  if (params.difficulty) query = query.where('difficulty', '==', params.difficulty);
  if (params.isPreviousYear !== undefined) query = query.where('isPreviousYear', '==', params.isPreviousYear);
  if (params.year) query = query.where('year', '==', params.year);
  if (params.createdBy) query = query.where('createdBy', '==', params.createdBy);
  if (params.tags?.length) query = query.where('tags', 'array-contains-any', params.tags);

  const page = params.page || 1;
  const limit = params.limit || 50;
  const offset = (page - 1) * limit;

  const snapshot = await query.offset(offset).limit(limit).get();
  let docs = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));

  if (params.search) {
    const s = params.search.toLowerCase();
    docs = docs.filter((d: any) => d.text.toLowerCase().includes(s));
  }

  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  return { items: docs, total, page, limit };
}

export async function importFromConcept(textbookId: string, chapterId: string, conceptId: string, userId: string) {
  const existingResult = await listQuestions({ createdBy: userId });
  const existingTexts = new Set(existingResult.items.map((q: any) => q.text));

  const conceptRef = collections.textbooks()
    .doc(textbookId).collection('chapters')
    .doc(chapterId).collection('concepts')
    .doc(conceptId);

  const conceptSnap = await conceptRef.get();
  if (!conceptSnap.exists) return { imported: 0 };

  const concept = conceptSnap.data() as any;
  const bank = concept.questionBank || [];
  let imported = 0;

  for (const q of bank) {
    if (existingTexts.has(q.text)) continue;
    await createQuestion({
      text: q.text,
      type: mapType(q.type),
      difficulty: q.difficulty || 'medium',
      options: q.options,
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation,
      points: q.points || 1,
      tags: [q.category].filter(Boolean),
      classId: '',
      subjectId: '',
      conceptId,
      createdBy: userId,
    });
    imported++;
  }

  logger.info('Questions imported from concept', { conceptId, imported });
  return { imported };
}

function mapType(type: string): CreateQuestionData['type'] {
  const map: Record<string, CreateQuestionData['type']> = {
    mcq: 'multiple_choice',
    multiple_choice: 'multiple_choice',
    true_false: 'true_false',
    fill_blank: 'fill_blank',
    short_answer: 'short_answer',
    long_answer: 'essay',
    numerical: 'short_answer',
    scenario: 'essay',
    matching: 'matching',
    essay: 'essay',
  };
  return map[type] || 'multiple_choice';
}
