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
