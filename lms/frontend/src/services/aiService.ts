import api from './api';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(
  message: string,
  history?: ChatMessage[]
): Promise<{ reply: string }> {
  const systemPrompt = 'You are a helpful AI tutor for students. Answer questions clearly, explain concepts step-by-step. Use markdown: code blocks (```...```) for code, $$...$$ for LaTeX math equations, **bold** for emphasis, and tables when comparing data. Be thorough but concise.';

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: message },
  ];

  try {
    const res = await api.post('/ai/chat', { messages, temperature: 0.7, max_tokens: 4096, jsonMode: false });
    let reply = (res.data?.data?.content || '').trim();
    if (reply.startsWith('{') || reply.startsWith('[')) {
      try {
        const parsed = JSON.parse(reply);
        reply = parsed.answer || parsed.message || parsed.response || parsed.content || parsed.text || reply;
      } catch {}
    }
    return { reply };
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: { error?: { message?: string } } }; message?: string };
    const backendMsg = axiosErr.response?.data?.error?.message;
    if (axiosErr.response?.status === 502) {
      throw new Error(backendMsg || 'AI service unavailable. Please try again later.');
    }
    throw new Error(backendMsg || axiosErr.message || 'Failed to get AI response');
  }
}

/** Choose a model based on the processing step. Falls back to the generic model env var, then a default. */
export function getModel(step: 'extract' | 'content' | 'question') {
  const specificKey =
    step === 'extract' ? 'VITE_OPENROUTER_MODEL_EXTRACT' :
      step === 'content' ? 'VITE_OPENROUTER_MODEL_CONTENT' :
        'VITE_OPENROUTER_MODEL_QUESTION';
  const specific = import.meta.env[specificKey] as string | undefined;
  return specific || (import.meta.env.VITE_OPENROUTER_MODEL as string) || 'google/gemini-2.0-flash-001:free';
}

/** Strip control characters that break JSON.parse. */
function sanitizeJson(raw: string): string {
  return raw.replace(/[\x00-\x1F\u200B-\u200F\uFEFF]/g, '');
}

/** Attempt to parse/repair JSON — tries increasingly aggressive fixes. */
function safeParse(text: string): unknown {
  const tryParse = (s: string) => JSON.parse(s);

  // 1. Direct
  try { return tryParse(text); } catch { /* fall through */ }

  // 2. Strip control chars
  let s = text.replace(/[\x00-\x1F\u200B-\u200F\uFEFF]/g, '');
  try { return tryParse(s); } catch { /* fall through */ }

  // 3. Remove trailing commas
  s = s.replace(/,\s*([}\]])/g, '$1');
  try { return tryParse(s); } catch { /* fall through */ }

  // 4. Missing comma after } or ] before next key:  }"key":  /  ]"key":
  s = s.replace(/([}\]])"([^"]*"\s*:)/g, '$1,"$2');
  try { return tryParse(s); } catch { /* fall through */ }

  // 5. Missing comma after string value before next key: "value""key":
  s = s.replace(/"([^"\\]*)"\s+"([^"]*"\s*:)/g, '"$1","$2"');
  try { return tryParse(s); } catch { /* fall through */ }

  // 6. Missing comma after number/bool/null before next key: 1"key": / true"key":
  s = s.replace(/(\d)\s+"([^"]*"\s*:)/g, '$1,"$2');
  s = s.replace(/(true|false|null)\s+"([^"]*"\s*:)/g, '$1,"$2');
  try { return tryParse(s); } catch { /* fall through */ }

  // 7. Unquoted keys: {foo: -> {"foo":
  s = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  try { return tryParse(s); } catch { /* fall through */ }

  // 8. Single quotes instead of double
  s = s.replace(/'/g, '"');
  try { return tryParse(s); } catch { /* fall through */ }

  console.error('AI JSON repair failed, raw snippet:', text.slice(0, 1000));
  throw new SyntaxError('Failed to parse AI response as JSON');
}

/** Try to extract valid JSON from a response — finds the first {…} block. */
function extractJson(raw: string): string {
  const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gm, '').trim();
  const braceStart = cleaned.indexOf('{');
  if (braceStart === -1) return cleaned;
  let depth = 0;
  const inString = new Array<boolean>(cleaned.length).fill(false);
  let str = false;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '"' && (i === 0 || cleaned[i - 1] !== '\\')) str = !str;
    inString[i] = str;
  }
  for (let i = braceStart; i < cleaned.length; i++) {
    if (inString[i]) continue;
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
    max_tokens: 2048,
    jsonMode: true,
  };

  try {
    const res = await api.post('/ai/chat', payload);
    const raw = res.data?.data?.content || '';
    return extractJson(raw);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: { error?: { message?: string } } }; message?: string };
    const backendMsg = axiosErr.response?.data?.error?.message;
    if (axiosErr.response?.status === 502) {
      throw new Error(backendMsg || 'AI service unavailable. Check server configuration.');
    }
    throw new Error(backendMsg || axiosErr.message || 'AI request failed');
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
  return safeParse(sanitizeJson(result)) as ReturnType<typeof extractChapters>;
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
      "type": "mcq|true_false|fill_blank|matching|numerical|descriptive",
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
- 18 questions: exactly 3 for each type: mcq, true_false, fill_blank, matching, numerical, descriptive
- 2-3 assignments: at least one worksheet and one challenge/problem-solving task`;

  const result = await callAI(prompt, 'content');
  return safeParse(sanitizeJson(result)) as ReturnType<typeof generateConceptContentAndQuestions>;
}
