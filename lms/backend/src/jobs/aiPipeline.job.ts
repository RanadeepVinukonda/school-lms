/**
 * AI Pipeline Job — processes a textbook PDF asynchronously.
 *
 * Steps:
 *  1. Fetch textbook doc from Firestore to get storagePath
 *  2. Download PDF buffer from Firebase Storage
 *  3. Extract text with pdf-parse
 *  4. Build Gemini prompt requesting structured JSON
 *  5. Call chatCompletion() from ai.service.ts
 *  6. Parse + validate JSON response
 *  7. Write chapters subcollection, then for each chapter write concepts
 *     Each concept gets a questionBank with at least 1 of each of the 7 question types
 *  8. Update textbook status → "ready"
 *
 * On any error: update status → "failed", write failureReason, notify teacher.
 */

import { v4 as uuidv4 } from 'uuid';
import { getAdminFirestore } from '../firebase/admin';
// import { getBucket } from '../firebase/storage'; // Removed Firebase storage import
import { chatCompletion } from '../services/ai.service';
import { logger } from '../utils/logger';

// ─── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'matching' | 'descriptive' | 'numerical' | 'passage';
type Difficulty = 'easy' | 'medium' | 'hard' | 'hots';

interface LLMQuestion {
  type: QuestionType;
  difficulty: Difficulty;
  text: string;
  options?: string[];
  correctAnswer: string;
  passageText?: string;
  explanation?: string;
  points: number;
}

interface LLMConcept {
  title: string;
  order: number;
  notes: string;
  videoLinks: string[];
  questions: LLMQuestion[];
}

interface LLMChapter {
  title: string;
  order: number;
  summary: string;
  concepts: LLMConcept[];
}

interface LLMResponse {
  chapters: LLMChapter[];
}

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(textContent: string): string {
  const maxChars = 60_000;
  const truncated =
    textContent.length > maxChars
      ? textContent.slice(0, maxChars) + '\n\n[...content truncated...]'
      : textContent;

  return `You are an expert curriculum designer. Analyze the textbook below and extract a complete structured curriculum.

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "chapters": [
    {
      "title": "string",
      "order": number,
      "summary": "string",
      "concepts": [
        {
          "title": "string",
          "order": number,
          "notes": "string (3+ paragraph study notes)",
          "videoLinks": ["YouTube search URL strings"],
          "questions": [
            {
              "type": "mcq|true_false|fill_blank|matching|descriptive|numerical|passage",
              "difficulty": "easy|medium|hard|hots",
              "text": "string",
              "options": ["string"] (required for mcq, true_false, matching, passage),
              "correctAnswer": "string",
              "passageText": "string (only for passage type)",
              "explanation": "string",
              "points": number
            }
          ]
        }
      ]
    }
  ]
}

REQUIREMENTS:
- Extract ALL chapters and key concepts
- For EACH concept generate AT LEAST 7 questions covering ALL types: mcq, true_false, fill_blank, matching, descriptive, numerical, passage
- MCQ: exactly 4 options
- true_false: options must be ["True","False"]
- passage: must include passageText and options
- fill_blank: use ___ in question text
- numerical: correctAnswer is a number as string
- Generate questions at multiple difficulty levels
- videoLinks: use format "https://www.youtube.com/results?search_query=<topic>"

TEXTBOOK CONTENT:
${truncated}`;
}

// ─── Validation ────────────────────────────────────────────────────────────────

const VALID_TYPES = new Set<string>(['mcq', 'true_false', 'fill_blank', 'matching', 'descriptive', 'numerical', 'passage']);
const VALID_DIFFICULTIES = new Set<string>(['easy', 'medium', 'hard', 'hots']);

function sanitizeQuestion(q: unknown, conceptId: string, idx: number): LLMQuestion & { id: string; conceptId: string } {
  const raw = q as Record<string, unknown>;
  return {
    id: uuidv4(),
    conceptId,
    type: (VALID_TYPES.has(String(raw.type)) ? raw.type : 'mcq') as QuestionType,
    difficulty: (VALID_DIFFICULTIES.has(String(raw.difficulty)) ? raw.difficulty : 'medium') as Difficulty,
    text: String(raw.text ?? `Question ${idx + 1}`),
    options: Array.isArray(raw.options) ? (raw.options as unknown[]).map(String) : undefined,
    correctAnswer: String(raw.correctAnswer ?? ''),
    passageText: raw.passageText ? String(raw.passageText) : undefined,
    explanation: raw.explanation ? String(raw.explanation) : undefined,
    points: typeof raw.points === 'number' && raw.points > 0 ? raw.points : 5,
  };
}

/** Ensure at least one question of each required type exists in the bank. */
function ensureAllTypes(
  questions: Array<LLMQuestion & { id: string; conceptId: string }>,
  conceptTitle: string,
  conceptId: string,
): Array<LLMQuestion & { id: string; conceptId: string }> {
  const required: QuestionType[] = ['mcq', 'true_false', 'fill_blank', 'matching', 'descriptive', 'numerical', 'passage'];
  const present = new Set(questions.map((q) => q.type));

  for (const type of required) {
    if (present.has(type)) continue;
    const base = { id: uuidv4(), conceptId, difficulty: 'medium' as Difficulty, text: '', correctAnswer: '', points: 5 };

    switch (type) {
      case 'mcq':
        questions.push({ ...base, type, text: `Which best describes ${conceptTitle}?`, options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'Option A' });
        break;
      case 'true_false':
        questions.push({ ...base, type, text: `${conceptTitle} is a key concept in this subject.`, options: ['True', 'False'], correctAnswer: 'True' });
        break;
      case 'fill_blank':
        questions.push({ ...base, type, text: `The study of ${conceptTitle} is central to ___.`, correctAnswer: 'this subject' });
        break;
      case 'matching':
        questions.push({ ...base, type, text: `Match terms related to ${conceptTitle}.`, options: ['Term A - Def 1', 'Term B - Def 2', 'Term C - Def 3'], correctAnswer: 'Term A:Def 1|Term B:Def 2|Term C:Def 3' });
        break;
      case 'descriptive':
        questions.push({ ...base, type, difficulty: 'hots', text: `Explain the significance of ${conceptTitle} and its real-world applications.`, correctAnswer: 'Comprehensive answer covering definition, principles, applications.', points: 10 });
        break;
      case 'numerical':
        questions.push({ ...base, type, difficulty: 'hard', text: `If the base value for ${conceptTitle} is 5, what is double that value?`, correctAnswer: '10', explanation: '5 × 2 = 10' });
        break;
      case 'passage':
        questions.push({
          ...base, type, difficulty: 'hots', points: 8,
          text: `Based on the passage, what is the main idea about ${conceptTitle}?`,
          passageText: `${conceptTitle} plays a vital role in this subject. Recent studies highlight its importance in theoretical and practical contexts.`,
          options: ['It is well-established', 'It is controversial', 'It is unimportant', 'It is purely theoretical'],
          correctAnswer: 'It is well-established',
        });
        break;
    }
  }

  return questions;
}

function parseLLMResponse(raw: string): LLMResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in LLM response');
    parsed = JSON.parse(match[0]);
  }

  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.chapters)) throw new Error("LLM response missing 'chapters' array");
  return obj as unknown as LLMResponse;
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────

export async function runAIPipeline(textbookId: string): Promise<void> {
  logger.info('AI pipeline starting', { textbookId });
  const db = getAdminFirestore();
  let teacherId: string | undefined;

  try {
    // Step 1: Fetch textbook doc
    const textbookDoc = await db.collection('textbooks').doc(textbookId).get();
    if (!textbookDoc.exists) throw new Error(`Textbook ${textbookId} not found`);

    const textbookData = textbookDoc.data()!;
    teacherId = textbookData.teacherId as string | undefined;
    const storagePath = textbookData.storagePath as string | undefined;

    if (!storagePath) throw new Error('Textbook has no storagePath');

    // Step 2: Download PDF
    logger.info('Downloading PDF', { textbookId, storagePath });
    // Retrieve the textbook document to get Cloudinary PDF URL
    const pdfUrl = textbookData.pdfUrl;
    if (!pdfUrl) {
      throw new Error('PDF URL not found for textbook');
    }
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF from Cloudinary: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Step 3: Extract text with pdf-parse (dynamic import for CJS compat)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const pdfData = await pdfParse(pdfBuffer);
    const textContent = pdfData.text?.trim() ?? '';

    if (!textContent) throw new Error('PDF text extraction returned empty content — may be image-only or corrupt');

    logger.info('PDF text extracted', { textbookId, chars: textContent.length });

    // Step 4-5: Call Gemini
    const rawResponse = await chatCompletion({
      model: 'gemini-2.0-flash',
      messages: [
        { role: 'system', content: 'You are an expert curriculum designer. Respond with valid JSON only, no markdown.' },
        { role: 'user', content: buildPrompt(textContent) },
      ],
      temperature: 0.4,
      max_tokens: 32768,
    });

    // Step 6: Parse response
    const llmResponse = parseLLMResponse(rawResponse);
    if (!llmResponse.chapters.length) throw new Error('LLM returned empty chapters array');

    logger.info('LLM response parsed', { textbookId, chapters: llmResponse.chapters.length });

    // Step 7: Write to Firestore
    const textbookRef = db.collection('textbooks').doc(textbookId);
    let totalChapters = 0;
    let totalConcepts = 0;

    for (const chapter of llmResponse.chapters) {
      const chapterId = uuidv4();
      const chapterRef = textbookRef.collection('chapters').doc(chapterId);

      await chapterRef.set({
        id: chapterId,
        title: String(chapter.title ?? 'Untitled Chapter'),
        order: typeof chapter.order === 'number' ? chapter.order : totalChapters + 1,
        summary: String(chapter.summary ?? ''),
      });
      totalChapters++;

      const concepts = Array.isArray(chapter.concepts) ? chapter.concepts : [];
      for (const concept of concepts) {
        const conceptId = uuidv4();
        const conceptRef = chapterRef.collection('concepts').doc(conceptId);

        let questions = (Array.isArray(concept.questions) ? concept.questions : []).map(
          (q, idx) => sanitizeQuestion(q, conceptId, idx),
        );
        questions = ensureAllTypes(questions, String(concept.title ?? 'concept'), conceptId);

        const videoLinks = Array.isArray(concept.videoLinks)
          ? (concept.videoLinks as unknown[]).map(String)
          : [`https://www.youtube.com/results?search_query=${encodeURIComponent(String(concept.title ?? ''))}`];

        await conceptRef.set({
          id: conceptId,
          title: String(concept.title ?? 'Untitled Concept'),
          order: typeof concept.order === 'number' ? concept.order : totalConcepts + 1,
          notes: String(concept.notes ?? ''),
          videoLinks,
          questionBank: [],
        });

        const questionsColl = conceptRef.collection('questions');
        for (const q of questions) {
          await questionsColl.doc(q.id).set(q);
        }
        totalConcepts++;
      }
    }

    // Step 8: Mark ready
    await textbookRef.update({
      status: 'ready',
      chapterCount: totalChapters,
      updatedAt: new Date().toISOString(),
      failureReason: null,
    });

    logger.info('AI pipeline complete', { textbookId, totalChapters, totalConcepts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('AI pipeline failed', { textbookId, error: message });

    try {
      await getAdminFirestore().collection('textbooks').doc(textbookId).update({
        status: 'failed',
        failureReason: message.slice(0, 1000),
        updatedAt: new Date().toISOString(),
      });

      if (teacherId) {
        await getAdminFirestore().collection('notifications').add({
          recipientId: teacherId,
          type: 'pipeline_failed',
          title: 'Textbook Processing Failed',
          body: `AI pipeline failed: ${message.slice(0, 300)}`,
          metadata: { textbookId },
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (updateErr) {
      logger.error('Failed to update textbook status after pipeline failure', { textbookId, updateErr });
    }
  }
}
