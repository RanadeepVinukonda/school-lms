import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from './supabase';
import { chatCompletion } from './ai.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface GeneratedQuestion {
  id: string;
  question: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options: string[] | null;
  answer: string;
  explanation: string;
  points: number;
  aiGenerated: boolean;
  source: 'ai';
  bloomLevel?: string;
  hots?: boolean;
  topic?: string;
  chapter?: string;
}

const QUESTION_TYPE_INSTRUCTIONS: Record<string, string> = {
  multiple_choice: '4 options with one correct answer',
  true_false: 'True or False statement',
  short_answer: 'Short answer question requiring a brief response',
  fill_blank: 'Fill in the blank with missing word(s)',
  matching: 'Two-column matching pairs (format: LeftItem:RightItem||LeftItem2:RightItem2)',
  descriptive: 'Descriptive/long answer question',
  numerical: 'Numerical problem with numeric answer',
  passage: 'Passage-based reading comprehension with MCQ',
  assertion_reason: 'Assertion and Reason style question (A: assertion, R: reason)',
  case_study: 'Case study based question with scenario',
  application_based: 'Real-world application scenario question',
  hots: 'Higher Order Thinking Skill question requiring analysis',
};

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

function resolveTypes(selectedTypes: string[]): string[] {
  return selectedTypes.flatMap((t) => TYPE_MAP[t] || [t]);
}

export async function generateQuestionsForConcept(params: {
  conceptId: string;
  textbookId: string;
  chapterId: string;
  conceptName: string;
  types: string[];
  count: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}): Promise<GeneratedQuestion[]> {
  const { conceptId, conceptName, types, difficulty } = params;
  const allQuestions: GeneratedQuestion[] = [];
  let remaining = params.count;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries && remaining > 0; attempt++) {
    try {
      const prompt = buildPrompt(conceptName, types, remaining, difficulty, attempt > 0);
      const raw = await chatCompletion({
        model: env.AI_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert educational assessment generator for K-12. Return ONLY valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 8192,
        jsonMode: true,
      });

      const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gm, '').trim();
      const braceStart = cleaned.indexOf('{');
      const braceEnd = cleaned.lastIndexOf('}');
      const jsonStr = braceStart !== -1 && braceEnd !== -1 ? cleaned.slice(braceStart, braceEnd + 1) : cleaned;
      const parsed = JSON.parse(jsonStr);
      const questions = (parsed.questions || parsed.results || (Array.isArray(parsed) ? parsed : [])).slice(0, remaining);

      for (const q of questions) {
        allQuestions.push({
          id: randomUUID(),
          question: q.question || q.text || '',
          type: q.type || 'mcq',
          difficulty: q.difficulty || difficulty || 'medium',
          options: q.options || null,
          answer: q.answer || q.correctAnswer || '',
          explanation: q.explanation || '',
          points: q.points || 2,
          aiGenerated: true,
          source: 'ai' as const,
          bloomLevel: q.bloomLevel || q.bloom_level || 'Understand',
          hots: q.hots === true || q.hots === 'true' || false,
          topic: q.topic || '',
          chapter: q.chapter || '',
        });
      }

      remaining -= questions.length;
      if (remaining > 0 && attempt < maxRetries) {
        logger.warn('AI returned fewer questions than requested, retrying', {
          conceptId, attempt, got: questions.length, stillNeeded: remaining,
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('AI question generation failed', { conceptId, attempt, error: errMsg });
      if (attempt < maxRetries) continue;
      break;
    }
  }

  return allQuestions;
}

export async function generateQuestionsFromTextbook(params: {
  textbookId: string;
  chapterId?: string;
  conceptId?: string;
  types: string[];
  totalCount: number;
}): Promise<GeneratedQuestion[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const query = supabase.from('concepts').select('id, title, data').eq('textbook_id', params.textbookId);
  if (params.chapterId) query.eq('chapter_id', params.chapterId);
  const { data: concepts, error } = await query;

  if (error || !concepts || concepts.length === 0) return [];

  const targetConcepts = params.conceptId
    ? concepts.filter((c: any) => c.id === params.conceptId)
    : concepts;

  const perConcept = Math.ceil(params.totalCount / targetConcepts.length);
  const allQuestions: GeneratedQuestion[] = [];

  for (const concept of targetConcepts) {
    if (allQuestions.length >= params.totalCount) break;
    const questions = await generateQuestionsForConcept({
      conceptId: concept.id,
      textbookId: params.textbookId,
      chapterId: params.chapterId || '',
      conceptName: concept.title || concept.data?.title || 'Untitled Concept',
      types: params.types,
      count: Math.min(perConcept, params.totalCount - allQuestions.length),
    });
    allQuestions.push(...questions);
  }

  return allQuestions.slice(0, params.totalCount);
}

export async function generateQuestionsFromExistingBank(params: {
  conceptId: string;
  textbookId: string;
  chapterId: string;
  types: string[];
  count: number;
}): Promise<GeneratedQuestion[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: existing, error } = await supabase
    .from('concept_questions')
    .select('question, type, difficulty')
    .eq('concept_id', params.conceptId);
  if (error) throw error;

  const existingTypes = new Set((existing || []).map((q: any) => q.type));
  const missingTypes = resolveTypes(params.types).filter((t) => !existingTypes.has(t));

  if (missingTypes.length === 0) return [];

  const supabase2 = getSupabaseAdmin();
  if (!supabase2) return [];

  const { data: concept, error: conceptError } = await supabase2
    .from('concepts')
    .select('title, data')
    .eq('id', params.conceptId)
    .single();
  if (conceptError) throw conceptError;

  const conceptName = concept?.title || concept?.data?.title || 'Untitled Concept';

  return generateQuestionsForConcept({
    conceptId: params.conceptId,
    textbookId: params.textbookId,
    chapterId: params.chapterId,
    conceptName,
    types: missingTypes,
    count: params.count,
  });
}

export async function saveAiQuestions(questions: GeneratedQuestion[], conceptId: string, textbookId: string, chapterId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const now = new Date().toISOString();
  const rows = questions.map((q) => ({
    id: q.id,
    concept_id: conceptId,
    textbook_id: textbookId,
    chapter_id: chapterId,
    question: q.question,
    type: q.type,
    difficulty: q.difficulty,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    points: q.points,
    ai_generated: true,
    bloom_level: q.bloomLevel || null,
    hots: q.hots === true || false,
    topic: q.topic || null,
    source: 'AI Textbook Upload',
    created_at: now,
    updated_at: now,
  }));

  const { error } = await supabase.from('concept_questions').upsert(rows, { ignoreDuplicates: false });
  if (error) {
    logger.error('Failed to save AI questions', { conceptId, error: error.message });
    throw error;
  }

  logger.info('AI questions saved to question bank', { conceptId, count: rows.length });
  return rows.length;
}

function buildPrompt(
  conceptName: string,
  types: string[],
  count: number,
  difficulty?: string,
  isRetry?: boolean,
): string {
  const typeDescriptions = resolveTypes(types)
    .map((t) => `- ${t}: ${QUESTION_TYPE_INSTRUCTIONS[t] || t}`)
    .join('\n');

  const difficultyInstruction = difficulty === 'mixed'
    ? 'Generate a mix of easy, medium, and hard questions.'
    : `All questions should be ${difficulty || 'medium'} difficulty.`;

  return `You are an educational assessment generator. Generate EXACTLY ${count} questions for the concept "${conceptName}".

SUPPORTED QUESTION TYPES:
${typeDescriptions}

${difficultyInstruction}

IMPORTANT RULES:
- Each question must be age-appropriate for K-12 students
- Questions must be self-contained and not reference external content
- Ensure answers are absolutely correct and unambiguous
- For MCQ questions, provide exactly 4 options with one correct answer
- For True/False, provide options ["True", "False"]
- For matching, use format: "Left1:Right1||Left2:Right2"
- Include a clear explanation for each answer
- Assign a Bloom's Taxonomy level: Remember, Understand, Apply, Analyze, Evaluate, Create
- Mark questions as HOTS (Higher Order Thinking Skill) when they require analysis, evaluation, or creation
- Assign a relevant topic name based on the concept

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "question text",
      "type": "mcq | true_false | short_answer | fill_blank | matching | descriptive | numerical | passage | assertion_reason | case_study | application_based | hots",
      "difficulty": "easy | medium | hard",
      "options": ["option1", "option2", "option3", "option4"] or null,
      "answer": "correct answer",
      "explanation": "explanation of answer",
      "points": 2,
      "bloomLevel": "Remember | Understand | Apply | Analyze | Evaluate | Create",
      "hots": true | false,
      "topic": "topic name related to the concept"
    }
  ]
}

Generate exactly ${count} questions. Return ONLY the JSON, no other text.${isRetry ? '\n\nIMPORTANT: The previous generation did NOT produce enough valid questions. You MUST generate EXACTLY the requested number this time. Do not skip any question. Every question must be complete and valid.' : ''}`;
}
