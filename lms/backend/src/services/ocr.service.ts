import Tesseract, { createWorker, PSM } from 'tesseract.js';

function tryParseJson(raw: string, fallback: any): any {
  try { return JSON.parse(raw); } catch { /* not JSON */ }
  const brace = raw.indexOf('{');
  const bracket = raw.indexOf('[');
  const start = brace >= 0 && (bracket < 0 || brace < bracket) ? brace : bracket;
  if (start >= 0) {
    let depth = 0, inStr = false;
    for (let i = start; i < raw.length; i++) {
      const c = raw[i];
      if (c === '"' && (i === 0 || raw[i - 1] !== '\\')) inStr = !inStr;
      if (inStr) continue;
      if (c === '{' || c === '[') depth++;
      if (c === '}' || c === ']') { depth--; if (depth === 0) { try { return JSON.parse(raw.slice(start, i + 1)); } catch { break; } } }
    }
  }
  return fallback;
}
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import * as aiService from './ai.service';
import { env } from '../config/env';

export interface OCRBlock {
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
}

export interface GeneratedQuestion {
  id: string;
  type: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface OCRMappingResult {
  conceptId: string;
  conceptName: string;
  questions: GeneratedQuestion[];
}

let worker: Tesseract.Worker | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (!worker) {
    worker = await createWorker('eng', 3, {
      logger: (m) => {
        if (m.status === 'loading tesseract core') logger.debug('OCR: loading core');
        else if (m.status === 'initializing tesseract') logger.debug('OCR: initializing');
        else if (m.status === 'loading language traineddata') logger.debug('OCR: loading language data');
        else if (m.status === 'initializing api') logger.debug('OCR: initializing API');
      },
    });
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    logger.info('OCR worker created (LSTM+Legacy, PSM AUTO)');
  }
  return worker;
}

export async function processChatMessage(
  messages: Array<{ role: string; content: string }>,
  imageBuffers: Buffer[],
): Promise<{ role: string; content: string; data?: Record<string, unknown> }> {
  let extractedText = '';
  if (imageBuffers.length > 0) {
    const results = await Promise.all(imageBuffers.map((b) => extractText(b)));
    extractedText = results.map((r) => r.text).filter(Boolean).join('\n\n---\n\n');
  }

  const systemPrompt = `You are an AI teaching assistant for a school LMS. You MUST output ONLY valid JSON. No greetings, no markdown, no extra text — just JSON.

{"action":"...","data":{...}}

ACTIONS:
- "quiz" — user wants a quiz. data: { questions: [{ id: "q1", type: "mcq"|"true_false"|"short_answer"|"fill_blank", question: "...", options?: [...], correctAnswer: "...", explanation: "...", difficulty: "easy"|"medium"|"hard" }] }
- "assignment" — user wants an assignment. data: { title: "...", description: "...", instructions: "...", questions: ["...", "..."], totalPoints: number, rubric: "..." }
- "mindmap" — user wants a mind map. data: { centralTopic: "...", nodes: [{ id: "n1", label: "...", children: ["n2","n3"] }, { id: "n2", label: "..." }] }
- "answer" — user asks a question. data: { message: "answer text" }
- "chat" — general chat. data: { message: "your response" }

Extracted text from images (if any) is below. Use it as context.`;

  const userContent = imageBuffers.length > 0
    ? `Extracted text from uploaded images:\n"""\n${extractedText.slice(0, 8000)}\n"""\n\nTeacher's message: ${messages[messages.length - 1]?.content || ''}`
    : messages[messages.length - 1]?.content || '';

  const aiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(0, -1).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userContent },
  ];

  try {
    const response = await aiService.chatCompletion({
      model: env.AI_MODEL,
      messages: aiMessages,
      temperature: 0.3,
      max_tokens: 2048,
    });

    if (!response || (typeof response === 'string' && response.trim().length < 3)) {
      return {
        role: 'assistant',
        content: 'I received your message, but the AI generated an empty response. Could you try rephrasing?',
        data: { action: 'chat', data: { message: 'Empty response from AI' } },
      };
    }

    const parsed = tryParseJson(response, { action: 'chat', data: { message: response } });

    const messageText = parsed.data?.message || parsed.data?.text || parsed.data?.response || parsed.data?.content || '';
    if (messageText) {
      return { role: 'assistant', content: messageText, data: parsed };
    }

    if (parsed.data?.questions) {
      return { role: 'assistant', content: `Generated ${parsed.data.questions.length} questions`, data: parsed };
    }
    if (parsed.data?.title) {
      return { role: 'assistant', content: `Generated assignment: ${parsed.data.title}`, data: parsed };
    }
    if (parsed.data?.centralTopic || parsed.data?.nodes) {
      return { role: 'assistant', content: `Generated mind map: ${parsed.data.centralTopic || 'Untitled'}`, data: parsed };
    }

    return {
      role: 'assistant',
      content: response.slice(0, 1000) || 'Done!',
      data: parsed,
    };
  } catch (error) {
    logger.error('Chat processing failed', { error: error instanceof Error ? error.message : String(error) });
    if (extractedText) {
      return {
        role: 'assistant',
        content: `I've extracted text from the uploaded images:\n\n${extractedText.slice(0, 2000)}`,
        data: { action: 'chat', text: extractedText },
      };
    }
    throw new AppError(502, 'AI service is currently unavailable. Please try again in a moment.');
  }
}

export async function extractText(imageBuffer: Buffer): Promise<OCRResult> {
  try {
    const w = await getWorker();
    const { data } = await w.recognize(imageBuffer);

    const blocks: OCRBlock[] = (data.blocks || []).map((block) => ({
      text: block.text,
      bbox: {
        x: block.bbox.x0,
        y: block.bbox.y0,
        width: block.bbox.x1 - block.bbox.x0,
        height: block.bbox.y1 - block.bbox.y0,
      },
      confidence: block.confidence,
    }));

    return {
      text: data.text,
      confidence: data.confidence,
      blocks,
    };
  } catch (error) {
    logger.error('OCR extraction failed', { error: error instanceof Error ? error.message : String(error) });
    throw new AppError(502, 'Failed to extract text from image');
  }
}

export async function mapTextToConcept(
  extractedText: string,
  concepts: Array<{ id: string; title: string; summary: string }>,
): Promise<{ conceptId: string; conceptName: string } | null> {
  const conceptsList = concepts.map((c) => `- ${c.id}: ${c.title} (${c.summary.slice(0, 100)})`).join('\n');

  const prompt = `You are a textbook concept classifier. Given the extracted OCR text from a textbook page, identify which concept from the provided list best matches the content.

Extracted text:
"""
${extractedText.slice(0, 6000)}
"""

Available concepts:
${conceptsList}

Return a JSON object with the matched concept id and name:
{
  "conceptId": "the_matching_concept_id_or_empty_string_if_no_match",
  "conceptName": "the_matching_concept_title_or_empty_string"
}`;

  try {
    const response = await aiService.chatCompletion({
      model: env.AI_MODEL,
      messages: [
        { role: 'system', content: 'You are a textbook content classifier. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 256,
    });

    const parsed = JSON.parse(response);
    if (parsed.conceptId && parsed.conceptName) {
      return { conceptId: parsed.conceptId, conceptName: parsed.conceptName };
    }
    return null;
  } catch (error) {
    logger.error('Concept mapping failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export interface GeneratedAssignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  questions: string[];
  totalPoints: number;
  rubric: string;
}

export async function generateAssignmentFromText(
  extractedText: string,
  conceptName: string,
  count: number = 5,
): Promise<GeneratedAssignment> {
  const prompt = `You are an educational assignment generator. Based on the following textbook content, create a comprehensive assignment with ${count} questions.

Textbook content:
"""
${extractedText.slice(0, 8000)}
"""

Concept: ${conceptName}

Return a JSON object with:
- id: a unique string (e.g., "assn-1")
- title: assignment title
- description: brief description
- instructions: detailed instructions for students
- questions: array of ${count} questions (mix of short answer, long answer, and analytical)
- totalPoints: total points (each question worth varying points)
- rubric: brief grading rubric

Example:
{
  "id": "assn-1",
  "title": "Assignment on ${conceptName}",
  "description": "Test your understanding of ${conceptName}",
  "instructions": "Answer all questions in detail. Show your work where applicable.",
  "questions": ["Explain the concept of...", "Compare and contrast..."],
  "totalPoints": 50,
  "rubric": "Each question is graded based on accuracy and completeness."
}`;

  try {
    const response = await aiService.chatCompletion({
      model: env.AI_MODEL,
      messages: [
        { role: 'system', content: 'You are an educational assignment generator. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const parsed = JSON.parse(response);
    return {
      id: parsed.id || `assn-${Date.now()}`,
      title: parsed.title || `Assignment on ${conceptName}`,
      description: parsed.description || '',
      instructions: parsed.instructions || 'Answer all questions.',
      questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, count) : [],
      totalPoints: parsed.totalPoints || count * 10,
      rubric: parsed.rubric || '',
    };
  } catch (error) {
    logger.error('Assignment generation failed', { error: error instanceof Error ? error.message : String(error) });
    return {
      id: `assn-${Date.now()}`,
      title: `Assignment on ${conceptName}`,
      description: '',
      instructions: 'Answer all questions.',
      questions: [],
      totalPoints: 0,
      rubric: '',
    };
  }
}

export async function generateQuestionsFromText(
  extractedText: string,
  conceptName: string,
  count: number = 5,
): Promise<GeneratedQuestion[]> {
  const prompt = `You are an educational assessment generator. Based on the following textbook content, generate ${count} interactive assessment questions.

Textbook content:
"""
${extractedText.slice(0, 8000)}
"""

Concept: ${conceptName}

Generate a mix of question types: mcq (multiple choice), true_false, short_answer, and fill_blank.
Return a JSON object with a "questions" array. Each question object has:
- id: a unique string (e.g., "q1", "q2")
- type: "mcq" | "true_false" | "short_answer" | "fill_blank"
- question: the question text
- options: array of 4 options (only for mcq)
- correctAnswer: the correct answer
- explanation: brief explanation of the answer
- difficulty: "easy" | "medium" | "hard"

Example:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin", "Madrid"],
      "correctAnswer": "Paris",
      "explanation": "Paris is the capital city of France.",
      "difficulty": "easy"
    }
  ]
}`;

  try {
    const response = await aiService.chatCompletion({
      model: env.AI_MODEL,
      messages: [
        { role: 'system', content: 'You are an educational assessment generator. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, count);
    }
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions.slice(0, count);
    }
    // Single question object — wrap in array
    if (parsed.question || parsed.type) {
      return [parsed].slice(0, count);
    }
    return [];
  } catch (error) {
    logger.error('Question generation failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}
