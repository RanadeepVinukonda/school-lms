const OPENROUTER_URL = import.meta.env.VITE_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';

function getApiKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY;
}

/** Choose a model based on the processing step. Falls back to a generic model if the specific env var is missing. */
export function getModel(step: 'extract' | 'content' | 'question') {
  switch (step) {
    case 'extract':
      return (import.meta.env.VITE_OPENROUTER_MODEL_EXTRACT as string) ||
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
    case 'content':
      return (import.meta.env.VITE_OPENROUTER_MODEL_CONTENT as string) ||
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
    case 'question':
      return (import.meta.env.VITE_OPENROUTER_MODEL_QUESTION as string) ||
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
    default:
      return 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
  }
}

/** Returns the OpenRouter API key from env, throwing if not configured. */
export function getOpenRouterApiKey(): string {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      'OpenRouter API key is not configured. Set VITE_OPENROUTER_API_KEY in your .env file and restart the dev server.',
    );
  }
  return key;
}

async function callOpenRouter(prompt: string, step: 'extract' | 'content' | 'question', schema?: Record<string, unknown>) {
  const apiKey = getOpenRouterApiKey();

  const messages = [
    {
      role: 'system',
      content: 'You are an AI textbook analysis engine. Extract educational content from textbook text and return it as structured JSON. Be thorough and accurate.',
    },
    { role: 'user', content: prompt },
  ];

  const body: Record<string, unknown> = {
    model: getModel(step),
    messages,
    temperature: 0.3,
    max_tokens: 16000,
  };

  if (schema) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401) {
      throw new Error(
        'OpenRouter rejected the API key. Check that VITE_OPENROUTER_API_KEY in your .env file is correct and restart the dev server.',
      );
    }
    throw new Error(`OpenRouter API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
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

  const result = await callOpenRouter(prompt, 'extract');
  try {
    return JSON.parse(result);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}

/** Generate detailed learning content for a concept using AI. */
export async function generateConceptContent(
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
}> {
  const prompt = `Generate detailed learning content for the concept "${conceptTitle}" in the chapter "${chapterTitle}" of "${subject}".

Textbook context:
${textbookContext.slice(0, 5000)}

Return valid JSON in this exact format:
{
  "summary": "2-3 sentence summary",
  "notes": "Detailed study notes covering all important points",
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "keywords": ["keyword1", "keyword2"],
  "difficulty": "beginner|intermediate|advanced",
  "prerequisites": ["prerequisite1"],
  "estimatedMinutes": 15
}`;

  const result = await callOpenRouter(prompt, 'content');
  try {
    return JSON.parse(result);
  } catch {
    throw new Error('Failed to parse AI response');
  }
}

/** Generate a question bank for a concept using AI. */
export async function generateQuestionBank(
  conceptTitle: string,
  chapterTitle: string,
  subject: string,
): Promise<{
  easy: Array<{ type: string; text: string; options?: string[]; correctAnswer: string | string[]; explanation: string }>;
  medium: Array<{ type: string; text: string; options?: string[]; correctAnswer: string | string[]; explanation: string }>;
  hard: Array<{ type: string; text: string; options?: string[]; correctAnswer: string | string[]; explanation: string }>;
  application: Array<{ type: string; text: string; options?: string[]; correctAnswer: string | string[]; explanation: string }>;
}> {
  const prompt = `Generate questions for the concept "${conceptTitle}" in "${chapterTitle}" (${subject}).

Generate:
- 8 Easy questions (simple recall)
- 6 Medium questions (application)
- 4 Hard questions (complex problems)
- 2 Critical thinking questions

Mix of MCQ, true/false, short answer, and numerical problems.

Return valid JSON in this exact format:
{
  "easy": [{ "type": "mcq|true_false|short_answer|numerical", "text": "question text", "options": ["A", "B", "C", "D"], "correctAnswer": "answer", "explanation": "why this is correct" }],
  "medium": [...],
  "hard": [...],
  "application": [...]
}`;

  const result = await callOpenRouter(prompt, 'question');
  try {
    return JSON.parse(result);
  } catch {
    throw new Error('Failed to parse AI response');
  }
}
