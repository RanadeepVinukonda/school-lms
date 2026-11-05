import { randomUUID } from 'crypto';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { nosqlGet, nosqlSet, nosqlUpdate, nosqlDelete, nosqlQuery } from './nosql.service';

export type TestType = 'quiz' | 'assignment' | 'exam';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'matching' | 'descriptive' | 'numerical' | 'passage' | 'assertion_reason' | 'case_study' | 'application_based' | 'hots';
export type TestStatus = 'draft' | 'released';
export type PublishTarget = 'class' | 'students';

export { createTest } from './test-question.service';
export { getTestResults, getTestAttemptsForStudent, getClassAttempts, releaseResults } from './test-report.service';
export { startTestAttempt, submitTestAttempt } from './unified-test-attempt.service';

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

export const TYPE_MAP: Record<string, string[]> = {
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

const QV2 = 'quizV2';
const QAV2 = 'quizAttemptV2';
const TMPL = 'testTemplates';

export const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

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
