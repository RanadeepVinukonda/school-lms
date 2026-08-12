let TesseractLib: typeof import('tesseract.js') | null = null;

async function loadTesseract() {
  if (!TesseractLib) TesseractLib = await import('tesseract.js');
  return TesseractLib;
}

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
import { textbookChatCompletion } from './ai.service';
import fs from 'fs';
import path from 'path';

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

function normalizeQuizQuestions(parsed: any): { questions: Record<string, any>[] } | null {
  let questions: any[] | null = null;
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed)) {
      questions = parsed;
    } else if (Array.isArray(parsed.questions)) {
      questions = parsed.questions;
    } else if (parsed.data && Array.isArray(parsed.data.questions)) {
      questions = parsed.data.questions;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      questions = parsed.data;
    }
  }
  if (!questions || questions.length === 0) return null;

  const first = questions[0];
  if (typeof first !== 'object' || first === null) return null;
  const looksLikeQuestion = typeof first.question === 'string' || typeof first.questionText === 'string'
    || typeof first.text === 'string' || Array.isArray(first.options);
  if (!looksLikeQuestion) return null;

  const questionKeys = ['question', 'q', 'question_text', 'questionText', 'stem', 'prompt', 'title', 'content', 'name', 'text'];

  const normalized = questions.map((q: any) => {
    const text = (questionKeys.map((k) => q && q[k]).find((v) => typeof v === 'string' && v.trim().length > 0)) || '';
    const options = Array.isArray(q?.options)
      ? q.options.map((o: any) => (typeof o === 'string' ? o : (o?.text ?? o?.label ?? o?.option ?? o?.value ?? String(o ?? '')))).filter((s: any) => typeof s === 'string')
      : [];
    return {
      id: q?.id || `q_${Math.random().toString(36).slice(2, 9)}`,
      type: (q?.type && typeof q.type === 'string') ? q.type : (options.length > 0 ? 'mcq' : 'short_answer'),
      question: text,
      options,
      correctAnswer: (q?.correctAnswer ?? q?.correct_answer ?? q?.correct ?? q?.answer ?? ''),
      explanation: (q?.explanation || ''),
      difficulty: (q?.difficulty || 'medium'),
      points: Number(q?.points ?? q?.marks ?? 1) || 1,
    };
  });

  return { questions: normalized };
}

export interface OCRMappingResult {
  conceptId: string;
  conceptName: string;
  questions: GeneratedQuestion[];
}

let worker: any = null;

/**
 * Resolve the folder that ships traineddata files (eng.traineddata sits at the
 * backend root, next to src/ and dist/). Returns null when no local file is
 * available so callers can fall back to tesseract.js's CDN download.
 */
function resolveTraineddataDir(): string | null {
  try {
    const candidate = path.resolve(__dirname, '..', '..');
    return fs.existsSync(path.join(candidate, 'eng.traineddata')) ? candidate : null;
  } catch {
    return null;
  }
}

async function getWorker() {
  if (!worker) {
    const T = await loadTesseract();
    const localDir = resolveTraineddataDir();
    // Use local .traineddata files when present so OCR works instantly on a
    // cold worker — no slow/fragile CDN download mid-request. Only request a
    // language when its file actually exists locally.
    const langs = localDir && fs.existsSync(path.join(localDir, 'hin.traineddata')) ? 'eng+hin' : 'eng';
    const options: Record<string, unknown> = {
      logger: (m: any) => {
        if (m.status === 'loading tesseract core') logger.debug('OCR: loading core');
        else if (m.status === 'initializing tesseract') logger.debug('OCR: initializing');
        else if (m.status === 'loading language traineddata') logger.debug('OCR: loading language data');
        else if (m.status === 'initializing api') logger.debug('OCR: initializing API');
      },
    };
    if (localDir) {
      options.langPath = localDir;
      options.gzip = false; // local files are uncompressed
    }
    worker = await T.createWorker(langs, 3, options);
    await worker.setParameters({ tessedit_pageseg_mode: T.PSM.AUTO });
    logger.info('OCR worker created (LSTM+Legacy, PSM AUTO)', { langs, langPath: localDir || 'cdn' });
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

  const systemPrompt = `You are a friendly AI teaching assistant for a school on Genesis. Respond conversationally and naturally — like a real tutor.

For general questions and chat, just give a helpful answer in plain text.

CRITICAL LANGUAGE RULE: If extracted textbook text is provided, ALWAYS generate questions and responses in the SAME LANGUAGE as that text. Detect the language from the extracted content and use it consistently.

Only use structured JSON when the user explicitly asks for:
- "quiz" → {"action":"quiz","data":{"questions":[{"id":"q1","type":"mcq","question":"Full question text here","options":["A","B","C","D"],"correctAnswer":"A","explanation":"...","difficulty":"easy","points":1}]}}

RULE FOR EVERY QUESTION: The "question" field MUST contain the complete, real question text and MUST NEVER be empty. For example: "What is the result of 120 - 78?" is a valid question; an empty string is never allowed.
- "assignment" → {"action":"assignment","data":{...}}
- "mindmap" → {"action":"mindmap","data":{...}}

Support all question types: mcq, true_false, short_answer, and matching. When the user asks for matching questions, generate them with options in "Left - Right" format.

Extracted text from images (if any) is below. Use it as context. Remember: write questions in the same language as the extracted text.`;

  const userContent = imageBuffers.length > 0
    ? `Extracted text from uploaded images:\n"""\n${extractedText.slice(0, 8000)}\n"""\n\nTeacher's message: ${messages[messages.length - 1]?.content || ''}`
    : messages[messages.length - 1]?.content || '';

  const aiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(0, -1).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userContent },
  ];

  try {
    const response = await textbookChatCompletion({
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

    const quizNormalized = normalizeQuizQuestions(parsed);
    if (quizNormalized) {
      return {
        role: 'assistant',
        content: `Generated ${quizNormalized.questions.length} questions`,
        data: { action: 'quiz', data: quizNormalized },
      };
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
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('Chat processing failed', { error: errMsg });
    if (extractedText) {
      return {
        role: 'assistant',
        content: `I've extracted text from the uploaded images:\n\n${extractedText.slice(0, 2000)}`,
        data: { action: 'chat', text: extractedText },
      };
    }
    throw new AppError(502, errMsg || 'AI service is currently unavailable. Please try again in a moment.');
  }
}

export async function extractText(imageBuffer: Buffer): Promise<OCRResult> {
  try {
    const w = await getWorker();
    const { data } = await w.recognize(imageBuffer);

    const blocks: OCRBlock[] = (data.blocks || []).map((block: any) => ({
      text: block.text,
      bbox: {
        x: block.bbox.x0,
        y: block.bbox.y0,
        width: block.bbox.x1 - block.bbox.x0,
        height: block.bbox.y1 - block.bbox.y0,
      },
      confidence: block.confidence,
    }));

    const result: OCRResult = { text: data.text, confidence: data.confidence, blocks };

    // Fall back to Google Vision API when Tesseract confidence is low (< 60%)
    // Requires GOOGLE_VISION_API_KEY env var to be set
    if (data.confidence < 60 && process.env.GOOGLE_VISION_API_KEY) {
      try {
        const visionResult = await extractTextVision(imageBuffer);
        if (visionResult && visionResult.confidence > result.confidence) {
          logger.info('Google Vision fallback used (better confidence)', {
            tesseract: result.confidence,
            vision: visionResult.confidence,
          });
          return visionResult;
        }
      } catch (visionErr) {
        logger.warn('Google Vision fallback failed, using Tesseract result', {
          error: visionErr instanceof Error ? visionErr.message : String(visionErr),
        });
      }
    }

    return result;
  } catch (error) {
    logger.error('OCR extraction failed', { error: error instanceof Error ? error.message : String(error) });
    throw new AppError(502, 'Failed to extract text from image');
  }
}

/**
 * Google Cloud Vision API fallback for OCR.
 * Used when Tesseract confidence is low (< 60%) and GOOGLE_VISION_API_KEY is configured.
 */
async function extractTextVision(imageBuffer: Buffer): Promise<OCRResult | null> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) return null;

  const base64Image = imageBuffer.toString('base64');
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as {
      responses: Array<{
        fullTextAnnotation?: { text: string; pages: Array<{ confidence?: number; blocks?: Array<{ boundingBox: { vertices: Array<{ x?: number; y?: number }> }; paragraphs: Array<{ words: Array<{ symbols: Array<{ text: string }> }> }> }> }> };
        error?: { message: string };
      }>;
    };

    const resp = json.responses?.[0];
    if (resp?.error) throw new Error(resp.error.message);
    if (!resp?.fullTextAnnotation) return null;

    const fullText = resp.fullTextAnnotation.text || '';
    const pageConfidence = resp.fullTextAnnotation.pages?.[0]?.confidence ?? 0.85;
    const confidence = Math.round(pageConfidence * 100);

    const blocks: OCRBlock[] = (resp.fullTextAnnotation.pages?.[0]?.blocks ?? []).map((b) => {
      const verts = b.boundingBox?.vertices ?? [];
      const x0 = verts[0]?.x ?? 0;
      const y0 = verts[0]?.y ?? 0;
      const x1 = verts[2]?.x ?? 0;
      const y1 = verts[2]?.y ?? 0;
      const text = b.paragraphs?.flatMap(p => p.words?.flatMap(w => w.symbols?.map(s => s.text) ?? []) ?? []).join('') ?? '';
      return { text, bbox: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, confidence };
    });

    return { text: fullText, confidence, blocks };
  } finally {
    clearTimeout(timer);
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

export { mapTextToConcept, generateAssignmentFromText, generateQuestionsFromText, getChaptersByTextbook, getConceptsByChapterIds, upsertFirestoreDoc } from './ocr-history.service';
