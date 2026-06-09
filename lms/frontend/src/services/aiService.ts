import api from './api';

/** Choose a model based on the processing step. Falls back to the generic model env var, then a default. */
export function getModel(step: 'extract' | 'content' | 'question') {
  const specificKey =
    step === 'extract' ? 'VITE_OPENROUTER_MODEL_EXTRACT' :
    step === 'content' ? 'VITE_OPENROUTER_MODEL_CONTENT' :
    'VITE_OPENROUTER_MODEL_QUESTION';
  const specific = import.meta.env[specificKey] as string | undefined;
  return specific || (import.meta.env.VITE_OPENROUTER_MODEL as string) || 'meta/llama-3.1-8b-instruct';
}

/** Returns the API key from env, throwing if not configured. */
export function getOpenRouterApiKey(): string {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      'OpenRouter API key is not configured. Set VITE_OPENROUTER_API_KEY in your .env file and restart the dev server.',
    );
  }
  return key;
}

/** Strip markdown code fences and whitespace so JSON.parse can work. */
function stripCodeFences(text: string): string {
  return text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gm, '').trim();
}

/** Strip control characters that break JSON.parse but don't affect semantic content. */
function sanitizeJson(raw: string): string {
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\u200B-\u200F\uFEFF]/g, '');
}

/** Try to extract valid JSON from a response — finds the first {…} or […] block. */
function extractJson(raw: string): string {
  const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gm, '').trim();
  const braceStart = cleaned.indexOf('{');
  if (braceStart === -1) return cleaned;
  let depth = 0;
  for (let i = braceStart; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0) return cleaned.slice(braceStart, i + 1);
    }
  }
  return cleaned;
}

async function callAI(prompt: string, step: 'extract' | 'content' | 'question') {
  const messages = [
    {
      role: 'system' as const,
      content: 'You are an AI textbook analysis engine. Extract educational content from textbook text and return it as structured JSON. Be thorough and accurate.',
    },
    { role: 'user' as const, content: prompt },
  ];

  const payload = {
    model: getModel(step),
    messages,
    temperature: 0.1,
    max_tokens: 4096,
  };

  try {
    const res = await api.post('/ai/chat', payload);
    const raw = res.data?.data?.content || '';
    return extractJson(raw);
  } catch (err: unknown) {
    const axiosErr = err as { status?: number; message?: string };
    if (axiosErr.status === 502) {
      throw new Error('AI service unavailable. Check server configuration.');
    }
    throw new Error(axiosErr.message || 'AI request failed');
  }
}

/** Extract chapter structure from textbook text using AI. */
export async function extractChapters(text: string, subject: string): Promise<{ title: string; chapters: { title: string; description: string; concepts: { title: string; description: string }[] }[] }> {
  const prompt = `Analyze this "${subject}" textbook text and extract its structure.

Return valid JSON in this exact format:
{
  "title": "Subject Title",
  "chapters": [
    {
      "title": "Chapter Title",
      "description": "Brief description",
      "concepts": [
        { "title": "Concept Title", "description": "Brief description" }
      ]
    }
  ]
}

Textbook content:
${text.slice(0, 30000)}`;

  const result = await callAI(prompt, 'extract');
  try {
    return JSON.parse(sanitizeJson(result));
  } catch {
    console.error('AI extract raw response:', result.slice(0, 1000));
    throw new Error('Failed to parse AI response as JSON');
  }
}

/** Generate content, questions, AND assignments for a concept in ONE AI call. */
export async function generateConceptContentAndQuestions(
  conceptTitle: string,
  chapterTitle: string,
  subject: string,
  textbookContext: string,
): Promise<{
  summary: string;
  notes: string;
  learningObjectives: string[];
  keywords: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  estimatedMinutes: number;
  questionBank: Array<{
    type: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    text: string;
    options?: string[];
    correctAnswer: string | string[];
    explanation: string;
    points: number;
  }>;
  assignments: Array<{
    title: string;
    instructions: string;
    marks: number;
    estimatedMinutes: number;
    answerKey: string;
    rubric: string;
    type: 'homework' | 'worksheet' | 'challenge' | 'project';
  }>;
}> {
  const prompt = `You are a curriculum designer. Generate complete learning material for the concept "${conceptTitle}" in the chapter "${chapterTitle}" of "${subject}".

Textbook context:
${textbookContext.slice(0, 5000)}

Return valid JSON in this exact format — no markdown, no code fences:

{
  "summary": "2-3 sentence summary of the concept",
  "notes": "Detailed study notes covering all important points (300-500 words)",
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "keywords": ["keyword1", "keyword2"],
  "difficulty": "beginner|intermediate|advanced",
  "prerequisites": ["prerequisite1"],
  "estimatedMinutes": 15,
  "questionBank": [
    {
      "type": "mcq|true_false|short_answer|numerical",
      "difficulty": "easy|medium|hard",
      "category": "recall|application|critical_thinking",
      "text": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "correct answer",
      "explanation": "Why this is correct",
      "points": 1
    }
  ],
  "assignments": [
    {
      "title": "Assignment title",
      "instructions": "Detailed instructions for the student",
      "marks": 10,
      "estimatedMinutes": 30,
      "answerKey": "Expected answers or solution guide",
      "rubric": "Marking rubric",
      "type": "homework|worksheet|challenge|project"
    }
  ]
}

Generate:
- 4-5 learning objectives
- 8-12 questions: mix of easy (MCQ/T-F), medium (short answer), hard (numerical/problem-solving)
- 2-3 assignments: at least one worksheet and one challenge/problem-solving task`;

  const result = await callAI(prompt, 'content');
  try {
    return JSON.parse(sanitizeJson(result));
  } catch (e) {
    console.error('AI content raw response:', result.slice(0, 1000));
    throw new Error(`Failed to parse consolidated AI response: ${String(e)}`);
  }
}
