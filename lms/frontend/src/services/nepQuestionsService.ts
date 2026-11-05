import api from './api';
import type { NEPQuestion, GradingRubric, FeedbackSummary } from '@/types/nepQuestions';

export async function generateQuestions(params: {
  conceptId: string;
  conceptName: string;
  subject: string;
  types: string[];
  difficulty: string;
  count: number;
}): Promise<NEPQuestion[]> {
  const res = await api.post('/nep-questions/generate', params);
  return res.data.data.questions;
}

export async function getNEPQuestions(conceptId: string): Promise<NEPQuestion[]> {
  const res = await api.get(`/nep-questions/${conceptId}`);
  return res.data.data;
}

export async function saveQuestions(conceptId: string, questions: Partial<NEPQuestion>[]): Promise<NEPQuestion[]> {
  const res = await api.post('/nep-questions/save', { conceptId, questions });
  return res.data.data;
}

export async function generateRubric(params: {
  assignmentId: string;
  title: string;
  description: string;
  totalMarks: number;
  numCriteria: number;
}): Promise<GradingRubric> {
  const res = await api.post('/nep-questions/rubric/generate', params);
  return res.data.data;
}

export async function saveRubric(data: {
  assignmentId: string;
  title: string;
  criteria: GradingRubric['criteria'];
  totalMarks: number;
}): Promise<GradingRubric> {
  const res = await api.post('/nep-questions/rubric/save', data);
  return res.data.data;
}

export async function getRubrics(assignmentId?: string): Promise<GradingRubric[]> {
  const res = await api.get('/nep-questions/rubric/list', { params: { assignmentId } });
  return res.data.data;
}

export async function getRubricById(id: string): Promise<GradingRubric> {
  const res = await api.get(`/nep-questions/rubric/${id}`);
  return res.data.data;
}

export async function generateFeedback(params: {
  submissionId: string;
  rubricId: string;
  studentAnswer: string;
  rubric: GradingRubric;
}): Promise<FeedbackSummary> {
  const res = await api.post('/nep-questions/rubric/feedback', params);
  return res.data.data;
}
