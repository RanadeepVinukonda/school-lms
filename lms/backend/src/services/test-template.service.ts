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
  let query: FirebaseFirestore.Query = collections.testTemplates();

  if (params.classId) query = query.where('classId', '==', params.classId);
  if (params.subjectId) query = query.where('subjectId', '==', params.subjectId);
  if (params.createdBy) query = query.where('createdBy', '==', params.createdBy);
  if (params.status) query = query.where('status', '==', params.status);

  const snapshot = await query.get();
  const results = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
  results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}

export async function compilePaper(data: {
  templateId: string;
  textbookId?: string;
  chapterId?: string;
  conceptId?: string;
  userId: string;
}) {
  const templateDoc = await collections.testTemplates().doc(data.templateId).get();
  if (!templateDoc.exists) throw new NotFoundError('Template not found');
  const template = templateDoc.data()!;

  const textbookId = data.textbookId || template.selectionConfig?.textbookId;
  const chapterId = data.chapterId || template.selectionConfig?.chapterId;
  const conceptId = data.conceptId || template.selectionConfig?.conceptId;
  if (!textbookId || !chapterId || !conceptId) {
    throw new Error('textbookId, chapterId, and conceptId are required to compile. Update the template with a textbook, chapter, and concept selection first.');
  }

  // Read question count and difficulty from selectionConfig (set at template creation)
  const targetCount = template.selectionConfig?.questionCount || 5;
  const difficultyDistribution = template.selectionConfig?.difficultyDistribution || { easy: 40, medium: 40, hard: 20 };

  const conceptDoc = await collections.textbooks()
    .doc(textbookId)
    .collection('chapters')
    .doc(chapterId)
    .collection('concepts')
    .doc(conceptId)
    .get();
  if (!conceptDoc.exists) throw new NotFoundError('Concept not found');
  const conceptData = conceptDoc.data()!;

  const questionBank = Array.isArray(conceptData.questionBank) ? conceptData.questionBank : [];

  // Filter allowed formats — map selectedModels from selectionConfig to question types
  const selectedModels: string[] = template.selectionConfig?.selectedModels || [];
  const allowedFormats = selectedModels.length > 0
    ? selectedModels.map((m: string) =>
        m === 'multiple_choice' ? 'mcq' :
        m === 'true_false' ? 'true_false' :
        m === 'fill_blank' ? 'fill_blank' :
        m === 'matching' ? 'matching' :
        m === 'numerical' ? 'numerical' :
        m === 'descriptive' ? 'descriptive' :
        m === 'passage' ? 'passage' : m
      )
    : ['mcq', 'true_false', 'fill_blank', 'matching', 'numerical', 'descriptive', 'passage'];
  let filtered = questionBank.filter((q: any) => allowedFormats.includes(q.type));

  // Reformat dynamically if needed (e.g. if allowedFormats doesn't match and we need to adapt)
  const adapted = filtered.map((q: any) => {
    const cloned = { ...q };
    // MCQ to Fill Blank
    if (cloned.type === 'mcq' && allowedFormats.includes('fill_blank') && !allowedFormats.includes('mcq')) {
      cloned.type = 'fill_blank';
      cloned.text = `${cloned.text} (Answer: ____________)`;
      delete cloned.options;
    }
    // True/False to MCQ
    if (cloned.type === 'true_false' && allowedFormats.includes('mcq') && !allowedFormats.includes('true_false')) {
      cloned.type = 'mcq';
      cloned.text = `Is the following statement True or False: ${cloned.text}`;
      cloned.options = ['True', 'False'];
    }
    return cloned;
  });

  const easyQ = adapted.filter((q: any) => q.difficulty === 'easy');
  const mediumQ = adapted.filter((q: any) => q.difficulty === 'medium');
  const hardQ = adapted.filter((q: any) => q.difficulty === 'hard' || q.difficulty === 'hots');

  const easyTarget = difficultyDistribution.easy || 0;
  const mediumTarget = difficultyDistribution.medium || 0;
  const hardTarget = difficultyDistribution.hard || 0;

  const selectedQuestions: any[] = [];
  selectedQuestions.push(...easyQ.slice(0, easyTarget));
  selectedQuestions.push(...mediumQ.slice(0, mediumTarget));
  selectedQuestions.push(...hardQ.slice(0, hardTarget));

  const remainingTarget = targetCount - selectedQuestions.length;
  if (remainingTarget > 0) {
    const alreadySelectedIds = new Set(selectedQuestions.map(q => q.id));
    const leftovers = adapted.filter((q: any) => !alreadySelectedIds.has(q.id));
    selectedQuestions.push(...leftovers.slice(0, remainingTarget));
  }

  // Jumble questions if specified
  if (template.config?.shuffleQuestions !== false) {
    selectedQuestions.sort(() => Math.random() - 0.5);
  }

  const paperId = uuidv4();
  const now = new Date().toISOString();

  const paperData = {
    id: paperId,
    templateId: data.templateId,
    conceptId,
    chapterId,
    textbookId,
    questions: selectedQuestions,
    totalPoints: selectedQuestions.reduce((sum, q) => sum + (q.points || 0), 0),
    createdBy: data.userId,
    createdAt: now,
    updatedAt: now,
  };

  await collections.questionPapers().doc(paperId).set(paperData);
  logger.info('Question paper compiled from template', { paperId, templateId: data.templateId, questionCount: selectedQuestions.length });

  return paperData;
}
