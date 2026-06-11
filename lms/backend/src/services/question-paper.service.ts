import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

interface SectionQuestion {
  questionId: string;
  points: number;
  order: number;
}

interface Section {
  title: string;
  instructions?: string;
  questions: SectionQuestion[];
}

interface SectionInput {
  title: string;
  instructions?: string;
  questionIds: string[];
  pointsPerQuestion?: number;
}

export async function createPaper(data: {
  title: string;
  description?: string;
  classId: string;
  subjectId: string;
  createdBy: string;
  sections: SectionInput[];
  duration?: number;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  let totalPoints = 0;

  const sections: Section[] = await Promise.all(data.sections.map(async (sec) => {
    const questions: SectionQuestion[] = [];
    for (let qi = 0; qi < sec.questionIds.length; qi++) {
      const qId = sec.questionIds[qi];
      const qSnap = await collections.questionBank().doc(qId).get();
      const pts = sec.pointsPerQuestion || (qSnap.exists ? (qSnap.data() as any).points || 1 : 1);
      questions.push({ questionId: qId, points: pts, order: qi });
      totalPoints += pts;
    }
    return { title: sec.title, instructions: sec.instructions, questions };
  }));

  const paperData = {
    id, title: data.title, description: data.description || null,
    classId: data.classId, subjectId: data.subjectId,
    createdBy: data.createdBy, sections,
    totalPoints, duration: data.duration || null,
    status: 'draft' as const,
    createdAt: now, updatedAt: now,
  };

  await collections.questionPapers().doc(id).set(paperData);
  logger.info('Question paper created', { id, title: data.title });
  return paperData;
}

export async function updatePaper(id: string, userId: string, data: Partial<{
  title: string; description: string; duration: number; status: 'draft' | 'ready';
}>) {
  const ref = collections.questionPapers().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Question paper not found');
  if (doc.data()!.createdBy !== userId) throw new ForbiddenError('Not your paper');

  const updates: any = { ...data, updatedAt: new Date().toISOString() };
  Object.keys(updates).forEach((k) => { if (updates[k] === undefined) delete updates[k]; });
  await ref.update(updates);
  const updated = await ref.get();
  return { ...updated.data() };
}

export async function deletePaper(id: string, userId: string) {
  const ref = collections.questionPapers().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Question paper not found');
  if (doc.data()!.createdBy !== userId) throw new ForbiddenError('Not your paper');
  await ref.delete();
  logger.info('Question paper deleted', { id });
}

export async function getPaper(id: string) {
  const ref = collections.questionPapers().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Question paper not found');
  return { ...doc.data() };
}

export async function listPapers(params: {
  classId?: string; subjectId?: string; createdBy?: string; status?: string;
}) {
  let query: FirebaseFirestore.Query = collections.questionPapers();

  if (params.classId) query = query.where('classId', '==', params.classId);
  if (params.subjectId) query = query.where('subjectId', '==', params.subjectId);
  if (params.createdBy) query = query.where('createdBy', '==', params.createdBy);
  if (params.status) query = query.where('status', '==', params.status);

  const snapshot = await query.get();
  const results = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
  results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}
