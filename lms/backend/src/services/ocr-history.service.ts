import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { textbookChatCompletion } from './ai.service';
import { detectLanguage, cleanOCRText } from './ocr.service';
import type { GeneratedQuestion } from './ocr.service';
import { getSupabaseAdmin } from './supabase';

export interface GeneratedAssignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  questions: string[];
  totalPoints: number;
  rubric: string;
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
    const response = await textbookChatCompletion({
      messages: [
        { role: 'system', content: 'You are a textbook content classifier. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 256,
    });

    let parsed: any;
    try { parsed = JSON.parse(response); } catch { return null; }
    if (parsed.conceptId && parsed.conceptName) {
      return { conceptId: parsed.conceptId, conceptName: parsed.conceptName };
    }
    return null;
  } catch (error) {
    logger.error('Concept mapping failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export async function generateAssignmentFromText(
  extractedText: string,
  conceptName: string,
  count: number = 5,
): Promise<GeneratedAssignment> {
  // Detect and clean language before sending to AI
  const detectedLang = detectLanguage(extractedText);
  const cleanText = cleanOCRText(extractedText, detectedLang);

  const langHint = detectedLang === 'hi'
    ? 'The source material is in HINDI. Generate the entire assignment in Hindi.'
    : detectedLang === 'te'
    ? 'The source material is in TELUGU. Generate the entire assignment in Telugu.'
    : detectedLang === 'en'
    ? 'The source material is in ENGLISH. Generate the entire assignment in English.'
    : 'The source material is mixed. Match the language of each section.';

  const prompt = `You are an educational assignment generator. Based on the following textbook content, create a comprehensive assignment with ${count} questions.

CRITICAL: ${langHint} Do NOT switch languages.

Textbook content:
"""
${cleanText.slice(0, 8000)}
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
    const response = await textbookChatCompletion({
      messages: [
        { role: 'system', content: `You are an educational assignment generator. ${langHint} Respond ONLY in the same language as the source material. NEVER switch languages. Return only valid JSON.` },
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
  // Detect and clean language before sending to AI
  const detectedLang = detectLanguage(extractedText);
  const cleanText = cleanOCRText(extractedText, detectedLang);

  const langHint = detectedLang === 'hi'
    ? 'The source material is in HINDI. Generate ALL questions in Hindi.'
    : detectedLang === 'te'
    ? 'The source material is in TELUGU. Generate ALL questions in Telugu.'
    : detectedLang === 'en'
    ? 'The source material is in ENGLISH. Generate ALL questions in English.'
    : 'The source material is mixed. Match the language of each section.';

  const prompt = `You are an educational assessment generator. Based on the following textbook content, generate ${count} interactive assessment questions.

CRITICAL: ${langHint} Do NOT switch languages.

Textbook content:
"""
${cleanText.slice(0, 8000)}
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
- difficulty: "easy" | "medium" | "hard"`;

  try {
    const response = await textbookChatCompletion({
      messages: [
        { role: 'system', content: `You are an educational assessment generator. ${langHint} Respond ONLY in the same language as the source material. NEVER switch languages. Return only valid JSON.` },
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
    if (parsed.question || parsed.type) {
      return [parsed].slice(0, count);
    }
    return [];
  } catch (error) {
    logger.error('Question generation failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function getChaptersByTextbook(textbookId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('chapters')
    .select('id, title')
    .eq('textbook_id', textbookId);
  if (error) throw new AppError(500, `Failed to fetch chapters: ${error.message}`);
  return (data || []) as Array<{ id: string; title: string }>;
}

export async function getConceptsByChapterIds(chapterIds: string[]) {
  if (chapterIds.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('concepts')
    .select('id, chapter_id, title, summary')
    .in('chapter_id', chapterIds);
  if (error) throw new AppError(500, `Failed to fetch concepts: ${error.message}`);
  return (data || []) as Array<{ id: string; chapter_id: string; title: string; summary: string }>;
}

export async function upsertFirestoreDoc(collection: string, docId: string, data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('firestore_docs')
    .upsert({ collection, doc_id: docId, data, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (error) throw new AppError(500, `Failed to upsert Firestore doc: ${error.message}`);
}
