import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

interface TemplateConfig {
  timeLimitMinutes: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResults: boolean;
}

interface SelectionConfig {
  selectedModels: string[];
  questionCount: number;
  difficultyDistribution: { easy: number; medium: number; hard: number };
  chapterIds?: string[];
  conceptIds?: string[];
}

export async function createTemplate(data: {
  title: string;
  description?: string;
  classId: string;
  subjectId: string;
  createdBy: string;
  config: TemplateConfig;
  source: 'question_paper' | 'question_bank';
  questionPaperId?: string;
  selectionConfig?: SelectionConfig;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();

  if (data.source === 'question_paper' && !data.questionPaperId) {
    throw new Error('questionPaperId required when source is question_paper');
  }

  const templateData = {
    id,
    title: data.title,
    description: data.description || null,
    classId: data.classId,
    subjectId: data.subjectId,
    createdBy: data.createdBy,
    config: data.config,
    source: data.source,
    questionPaperId: data.questionPaperId || null,
    selectionConfig: data.selectionConfig || null,
    status: 'draft' as const,
    createdAt: now,
    updatedAt: now,
  };

  await collections.testTemplates().doc(id).set(templateData);
  logger.info('Test template created', { id, title: data.title });
  return templateData;
}

export async function updateTemplate(id: string, userId: string, data: Partial<{
  title: string; description: string; config: TemplateConfig;
  source: string; questionPaperId: string; selectionConfig: SelectionConfig;
  status: 'draft' | 'active' | 'archived';
}>) {
  const ref = collections.testTemplates().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Template not found');
  if (doc.data()!.createdBy !== userId) throw new ForbiddenError('Not your template');

  const updates: any = { ...data, updatedAt: new Date().toISOString() };
  Object.keys(updates).forEach((k) => { if (updates[k] === undefined) delete updates[k]; });
  await ref.update(updates);
  const updated = await ref.get();
  return { ...updated.data() };
}

export async function deleteTemplate(id: string, userId: string) {
  const ref = collections.testTemplates().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Template not found');
  if (doc.data()!.createdBy !== userId) throw new ForbiddenError('Not your template');
  await ref.delete();
  logger.info('Template deleted', { id });
}

export async function getTemplate(id: string) {
  const ref = collections.testTemplates().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Template not found');
  return { ...doc.data() };
}

export async function listTemplates(params: {
  classId?: string; subjectId?: string; createdBy?: string; status?: string;
}) {
  let query: FirebaseFirestore.Query = collections.testTemplates()
    .orderBy('createdAt', 'desc');

  if (params.classId) query = query.where('classId', '==', params.classId);
  if (params.subjectId) query = query.where('subjectId', '==', params.subjectId);
  if (params.createdBy) query = query.where('createdBy', '==', params.createdBy);
  if (params.status) query = query.where('status', '==', params.status);

  const snapshot = await query.get();
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
}
