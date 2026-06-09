const OPENROUTER_URL = import.meta.env.VITE_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';

function getApiKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY;
}

/** Choose a model based on the processing step. Falls back to the generic model env var, then a default. */
export function getModel(step: 'extract' | 'content' | 'question') {
  const specificKey =
    step === 'extract' ? 'VITE_OPENROUTER_MODEL_EXTRACT' :
    step === 'content' ? 'VITE_OPENROUTER_MODEL_CONTENT' :
    'VITE_OPENROUTER_MODEL_QUESTION';
  const specific = import.meta.env[specificKey] as string | undefined;
  return specific || (import.meta.env.VITE_OPENROUTER_MODEL as string) || 'nvidia/nemotron-3.5-content-safety:free';
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

/** Strip markdown code fences and whitespace so JSON.parse can work. */
function stripCodeFences(text: string): string {
  return text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gm, '').trim();
}

async function callOpenRouter(prompt: string, step: 'extract' | 'content' | 'question') {
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
    max_tokens: 32000,
  };

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
  const raw = data.choices?.[0]?.message?.content || '';
  return stripCodeFences(raw);
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

  const result = await callOpenRouter(prompt, 'content');
  try {
    return JSON.parse(result);
  } catch (e) {
    throw new Error(`Failed to parse consolidated AI response: ${String(e)}`);
  }
}
