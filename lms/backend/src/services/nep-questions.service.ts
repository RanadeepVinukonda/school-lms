import { v4 as uuidv4 } from 'uuid';
import { chatCompletion } from './ai.service';
import { getSupabaseClient } from './supabase';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { TransactionManager } from '../database/transaction-manager';

interface GenerateQuestionsParams {
  conceptId: string;
  conceptName: string;
  subject: string;
  types: ('olympiad' | 'competency' | 'viva')[];
  difficulty: string;
  count: number;
}

interface QuestionData {
  type: string;
  difficulty: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  marks: number;
  competencyArea?: string;
}

interface RubricCriterion {
  name: string;
  description: string;
  maxMarks: number;
  levels: { label: string; marks: number; description: string }[];
}

interface RubricData {
  title: string;
  criteria: RubricCriterion[];
  totalMarks: number;
}

const OLYMPIAD_PROMPT = `You are an Olympiad question expert for NEP-aligned education. Generate higher-order thinking questions that require multi-step problem solving, analogies, and critical analysis.

Return a JSON object with a "questions" array. Each question must have:
- type: "olympiad"
- difficulty: "easy" | "medium" | "hard"
- question: the question text (with markdown formatting if needed)
- options: array of 4 options for MCQ, or omit for subjective
- correctAnswer: the correct answer
- explanation: detailed step-by-step solution
- marks: number of marks (1-5)
- competencyArea: the competency being tested (e.g., "Analytical Reasoning", "Critical Thinking", "Problem Solving")`;

const COMPETENCY_PROMPT = `You are a competency-based assessment expert for NEP-aligned education. Generate real-world application scenarios, case studies, and practical problems that test applied knowledge.

Return a JSON object with a "questions" array. Each question must have:
- type: "competency"
- difficulty: "easy" | "medium" | "hard"
- question: the question text describing a real-world scenario
- options: array of 4 options for MCQ, or omit for subjective
- correctAnswer: the correct answer
- explanation: why this answer is correct with real-world context
- marks: number of marks (1-5)
- competencyArea: the competency (e.g., "Scientific Temper", "Problem Solving", "Critical Thinking", "Application")`;

const VIVA_PROMPT = `You are a viva voce (oral exam) expert for NEP-aligned education. Generate oral exam style questions with expected answer points that a teacher would ask in an interactive session.

Return a JSON object with a "questions" array. Each question must have:
- type: "viva"
- difficulty: "easy" | "medium" | "hard"
- question: the oral question text (designed for spoken response)
- correctAnswer: comprehensive expected answer points
- explanation: marking guidance for the teacher
- marks: number of marks (1-5)
- competencyArea: the competency (e.g., "Communication", "Concept Clarity", "Analytical Thinking")`;

function getPromptForType(type: string): string {
  switch (type) {
    case 'olympiad': return OLYMPIAD_PROMPT;
    case 'competency': return COMPETENCY_PROMPT;
    case 'viva': return VIVA_PROMPT;
    default: return OLYMPIAD_PROMPT;
  }
}

function extractJsonBlock(raw: string): string {
  const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gm, '').trim();
  const braceStart = cleaned.indexOf('{');
  if (braceStart === -1) return cleaned;
  let depth = 0;
  let inString = false;
  for (let i = braceStart; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (c === '"' && (i === 0 || cleaned[i - 1] !== '\\')) inString = !inString;
    if (inString) continue;
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return cleaned.slice(braceStart, i + 1);
    }
  }
  return cleaned;
}

export async function generateQuestions(params: GenerateQuestionsParams): Promise<QuestionData[]> {
  const { conceptName, subject, types, difficulty, count } = params;
  const allQuestions: QuestionData[] = [];

  for (const type of types) {
    const systemPrompt = getPromptForType(type);
    const perTypeCount = Math.ceil(count / types.length);

    const userPrompt = `Generate ${perTypeCount} ${difficulty} ${type} questions for the concept "${conceptName}" in ${subject}.

Each question should test deep understanding and be appropriate for ${difficulty === 'easy' ? 'foundational' : difficulty === 'medium' ? 'intermediate' : 'advanced'} level students.

Return valid JSON: { "questions": [ ... ] }`;

    try {
      const raw = await chatCompletion({

        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      });

      const cleaned = extractJsonBlock(raw);
      const parsed = JSON.parse(cleaned) as { questions: QuestionData[] };
      if (parsed.questions && Array.isArray(parsed.questions)) {
        allQuestions.push(...parsed.questions.slice(0, perTypeCount));
      }
    } catch (err) {
      logger.error('Failed to generate questions', { type, conceptName, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return allQuestions;
}

export async function saveQuestions(conceptId: string, questions: QuestionData[], userId: string) {
  const now = new Date().toISOString();
  const saved: any[] = [];

  for (const q of questions) {
    const id = uuidv4();
    const data = {
      id,
      conceptId,
      ...q,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
    saved.push(data);
  }

  const tm = new TransactionManager();
  await tm.runTransaction(async (tx) => {
    for (const s of saved) {
      tx.set('nepQuestions', s.id, s);
    }
  });

  logger.info('NEP questions saved', { conceptId, count: questions.length });
  return saved;
}

export async function getNEPQuestions(conceptId: string) {
  const supabase = getSupabaseClient()!;
  const { data: rows, error } = await supabase.from('nosql_docs').select('doc_id, data')
    .eq('collection', 'nepQuestions')
    .contains('data', { conceptId })
    .order('data->>createdAt', { ascending: false });
  if (error) throw new Error('Failed to fetch NEP questions: ' + error.message);

  return (rows || []).map((r) => ({ ...r.data as Record<string, unknown>, id: r.doc_id }));
}

export async function generateRubric(params: {
  title: string;
  description: string;
  totalMarks: number;
  numCriteria: number;
}): Promise<RubricData> {
  const { title, description, totalMarks, numCriteria } = params;

  const systemPrompt = `You are an expert in educational assessment design. Create detailed grading rubrics for NEP-aligned assignments.`;
  const userPrompt = `Create a grading rubric for the assignment "${title}".

Assignment Description: ${description}
Total Marks: ${totalMarks}
Number of Criteria: ${numCriteria}

Return valid JSON with this structure:
{
  "title": "${title}",
  "criteria": [
    {
      "name": "Criterion name",
      "description": "What this criterion measures",
      "maxMarks": max marks for this criterion,
      "levels": [
        { "label": "Excellent", "marks": highest, "description": "What excellent work looks like" },
        { "label": "Good", "marks": medium-high, "description": "What good work looks like" },
        { "label": "Satisfactory", "marks": medium-low, "description": "What satisfactory work looks like" },
        { "label": "Needs Improvement", "marks": lowest, "description": "What needs improvement looks like" }
      ]
    }
  ],
  "totalMarks": ${totalMarks}
}`;

  const raw = await chatCompletion({

    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 4096,
  });

  const cleaned = extractJsonBlock(raw);
  const rubric = JSON.parse(cleaned) as RubricData;
  return rubric;
}

export async function saveRubric(data: {
  assignmentId: string;
  title: string;
  criteria: RubricCriterion[];
  totalMarks: number;
  userId: string;
}) {
  const supabase = getSupabaseClient()!;
  const id = uuidv4();
  const now = new Date().toISOString();
  const rubricData = {
    id,
    assignmentId: data.assignmentId,
    title: data.title,
    criteria: data.criteria,
    totalMarks: data.totalMarks,
    createdBy: data.userId,
    createdAt: now,
    updatedAt: now,
  };

  const { error: insertError } = await supabase.from('nosql_docs').insert({
    collection: 'gradingRubrics', doc_id: id, data: rubricData, updated_at: now,
  });
  if (insertError) throw new Error(`Failed to insert rubric: ${insertError.message}`);
  logger.info('Rubric saved', { id, assignmentId: data.assignmentId });
  return rubricData;
}

export async function getRubrics(assignmentId?: string) {
  const supabase = getSupabaseClient()!;
  let query = supabase.from('nosql_docs').select('doc_id, data').eq('collection', 'gradingRubrics');
  if (assignmentId) query = query.contains('data', { assignmentId });
  const { data: rows, error: rubricsErr } = await query.order('data->>createdAt', { ascending: false });
  if (rubricsErr) throw new Error('Failed to fetch rubrics: ' + rubricsErr.message);
  return (rows || []).map((r: any) => ({ ...r.data, id: r.doc_id }));
}

export async function getRubricById(id: string) {
  const supabase = getSupabaseClient()!;
  const { data, error } = await supabase.from('nosql_docs').select('doc_id, data')
    .eq('collection', 'gradingRubrics').eq('doc_id', id).maybeSingle();
  if (error) throw new Error('Failed to fetch rubric: ' + error.message);
  if (!data) throw new NotFoundError('Rubric not found');
  return { ...(data.data as Record<string, unknown>), id: data.doc_id };
}

export async function generateFeedback(params: {
  studentAnswer: string;
  rubric: RubricData;
}): Promise<{
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  overallScore: number;
  grade: string;
}> {
  const { studentAnswer, rubric } = params;

  const systemPrompt = `You are an expert teacher providing personalized feedback on student submissions. Analyze the work against the rubric and provide constructive feedback.`;
  const userPrompt = `Evaluate this student submission against the provided rubric.

Rubric:
${JSON.stringify(rubric, null, 2)}

Student Submission:
${studentAnswer}

Return valid JSON with this exact structure:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "overallScore": numerical score out of ${rubric.totalMarks},
  "grade": "A|B|C|D|F"
}`;

  const raw = await chatCompletion({

    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 4096,
  });

  const cleaned = extractJsonBlock(raw);
  const feedback = JSON.parse(cleaned) as {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    overallScore: number;
    grade: string;
  };

  return {
    strengths: feedback.strengths || [],
    weaknesses: feedback.weaknesses || [],
    suggestions: feedback.suggestions || [],
    overallScore: feedback.overallScore || 0,
    grade: feedback.grade || 'F',
  };
}
