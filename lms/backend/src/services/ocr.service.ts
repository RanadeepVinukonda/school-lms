import Tesseract, { createWorker } from 'tesseract.js';
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
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'loading tesseract core') logger.debug('OCR: loading core');
        else if (m.status === 'initializing tesseract') logger.debug('OCR: initializing');
        else if (m.status === 'loading language traineddata') logger.debug('OCR: loading language data');
        else if (m.status === 'initializing api') logger.debug('OCR: initializing API');
      },
    });
    logger.info('OCR worker created');
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

  const systemPrompt = `You are an AI teaching assistant for a school LMS. You help teachers with the following tasks:

1. **Create Quiz** — When a teacher says "create a quiz" or "generate quiz questions", analyze any uploaded textbook images and generate a JSON quiz with multiple question types (mcq, true_false, short_answer, fill_blank). Return a JSON object with "action": "quiz" and "data" containing the questions array.

2. **Create Assignment** — When a teacher says "create assignment", analyze uploaded images and generate an assignment with long-form questions. Return JSON with "action": "assignment" and "data" containing title, description, instructions, questions array, totalPoints, rubric.

3. **Generate Mind Map** — When a teacher says "create mind map" or "mind map", analyze the content and generate a mind map structure. Return JSON with "action": "mindmap" and "data" containing a central topic and nodes array (each with id, label, children).

4. **Answer Questions** — When a teacher asks a question or has doubts, answer helpfully based on the uploaded content or general knowledge. Return plain text or JSON with "action": "answer" and "data" containing the response.

5. **General Conversation** — For any other requests, respond helpfully as an AI assistant.

When images are uploaded, their extracted text is provided below. Use it as context for your response.
Always respond in JSON format with "action" and "data" fields. For plain conversation, use action: "chat".`;

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
      temperature: 0.7,
      max_tokens: 4096,
    });

    const parsed = JSON.parse(response);
    return {
      role: 'assistant',
      content: parsed.data?.message || parsed.data?.text || JSON.stringify(parsed.data || parsed),
      data: parsed,
    };
  } catch (error) {
    logger.error('Chat processing failed', { error: error instanceof Error ? error.message : String(error) });
    // Fallback: just OCR and return text
    if (extractedText) {
      return {
        role: 'assistant',
        content: `I've extracted text from the uploaded images. Here's what I found:\n\n${extractedText.slice(0, 2000)}\n\nHow would you like me to help with this content?`,
        data: { action: 'chat', text: extractedText },
      };
    }
    throw new AppError(502, 'AI service unavailable. Please try again.');
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
${extractedText.slice(0, 3000)}
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
${extractedText.slice(0, 4000)}
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
${extractedText.slice(0, 4000)}
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
