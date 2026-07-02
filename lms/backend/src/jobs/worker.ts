import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from '../services/supabase';
import { chatCompletion } from '../services/ai.service';
import { getEmbedding } from '../services/transformers.service';
import { searchAndRankVideos } from '../services/video-ranker.service';
import { matchAndRankResources } from '../services/resource-ranker.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getBoss } from './queue';
import { computeMasteryInline } from '../services/adaptive/mastery.service';

// ponytail: subject lookup is a deferred peripheral. Keep Firestore for read-only name resolution.
import { getAdminFirestore } from '../database/admin';

async function addTextbookLog(textbookId: string, message: string) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const logEntry = `[${timestamp}] ${message}`;
    const { data: tb } = await supabase.from('textbooks').select('logs').eq('id', textbookId).single();
    const logs = (tb?.logs as string[]) || [];
    logs.push(logEntry);
    await supabase.from('textbooks').update({ logs, updated_at: new Date().toISOString() }).eq('id', textbookId);
  } catch (err) {
    logger.error('Failed to write textbook log', { textbookId, err });
  }
}

async function updateJobProgress(
  textbookId: string,
  progress: number,
  currentStep: string,
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'PROCESSING',
  error: string | null = null
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const now = new Date().toISOString();
  const { data: tb } = await supabase.from('textbooks').select('status').eq('id', textbookId).single();
  if (!tb) return;
  if (status === 'PROCESSING' && (tb.status === 'ready' || tb.status === 'failed')) return;
  await supabase.from('processing_jobs').upsert({
    id: textbookId, textbook_id: textbookId, status, progress, current_step: currentStep, error, updated_at: now,
  }, { onConflict: 'id', ignoreDuplicates: false });
  if (status === 'COMPLETED') {
    await supabase.from('textbooks').update({ status: 'ready', updated_at: now, failure_reason: null }).eq('id', textbookId);
  } else if (status === 'FAILED') {
    await supabase.from('textbooks').update({ status: 'failed', failure_reason: error || 'Unknown pipeline failure', updated_at: now }).eq('id', textbookId);
  } else {
    await supabase.from('textbooks').update({ status: 'processing', updated_at: now }).eq('id', textbookId);
  }
}

// ── Exported pipeline for inline execution ──────────────────────

export async function runUploadPipeline(textbookId: string, storagePath: string) {
  logger.info('runUploadPipeline: Starting PDF extraction and TOC planning', { textbookId });
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { data: textbookDoc } = await supabase.from('textbooks').select('*').eq('id', textbookId).single();
  if (!textbookDoc) {
    logger.warn('Textbook not found in DB, aborting pipeline without retry', { textbookId });
    return;
  }
  const pdfUrl = textbookDoc.pdf_url;
  if (!pdfUrl) throw new Error('PDF URL not found');

  await supabase.from('textbooks').update({ logs: [], completed_concepts: 0, updated_at: new Date().toISOString() }).eq('id', textbookId);
  await addTextbookLog(textbookId, "Downloading textbook PDF from storage...");
  await updateJobProgress(textbookId, 5, 'extract_text');

  let pdfBuffer: Buffer;
  if (pdfUrl && pdfUrl.startsWith('http')) {
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error(`Failed to download PDF from ${pdfUrl}: ${res.statusText}`);
    pdfBuffer = Buffer.from(await res.arrayBuffer());
  } else {
    const bucket = env.SUPABASE_STORAGE_BUCKET || 'textbooks';
    const { data: pdfData, error: dlError } = await supabase.storage.from(bucket).download(storagePath);
    if (dlError || !pdfData) throw new Error(`Failed to download PDF: ${dlError?.message || 'no data'}`);
    pdfBuffer = Buffer.from(await pdfData.arrayBuffer());
  }
  await addTextbookLog(textbookId, "PDF downloaded. Extracting text content page by page...");

  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: pdfBuffer });
  const pageTexts: string[] = [];
  try {
    const parsed = await parser.getText();
    const sortedPages = [...(parsed.pages || [])].sort((a, b) => a.num - b.num);
    for (const page of sortedPages) pageTexts.push(page.text || '');
  } finally {
    await parser.destroy();
  }
  if (pageTexts.length === 0 || pageTexts.every(t => !t.trim())) throw new Error('PDF yielded no readable text');
  await addTextbookLog(textbookId, `PDF parsed successfully. Total pages: ${pageTexts.length}.`);
  await updateJobProgress(textbookId, 10, 'extract_text');
  await supabase.from('raw_pages').delete().eq('textbook_id', textbookId);
  const pageRows = pageTexts.map((text, i) => ({ textbook_id: textbookId, page_num: i + 1, text, created_at: new Date().toISOString() }));
  for (let i = 0; i < pageRows.length; i += 100) {
    await supabase.from('raw_pages').insert(pageRows.slice(i, i + 100));
  }
  await updateJobProgress(textbookId, 15, 'chapters');
  await addTextbookLog(textbookId, "Analyzing syllabus layout and extracting Table of Contents (TOC) with Gemini AI...");

  const title = textbookDoc.title || 'Textbook';
  const tocText = pageTexts.slice(0, 100).join('\n').slice(0, 120000);
  let structure: { chapters: Array<{ title: string; order: number; summary: string; concepts: string[] }> } | null = null;
  try {
    const prompt = `You are a professional syllabus compiler. Read this textbook's opening pages and generate a complete curriculum outline for "${title}".
Extract EVERY single chapter and section from the table of contents. Do not skip any chapters.
Return ONLY valid JSON matching this schema (no markdown, no formatting):
{ "chapters": [{ "title": "Chapter title", "order": 1, "summary": "Short chapter description", "concepts": ["1.1 First Concept Name"] }] }
Textbook content:\n${tocText}`;
    const rawResponse = await chatCompletion({
      messages: [{ role: 'system', content: 'You respond in valid JSON only.' }, { role: 'user', content: prompt }],
      temperature: 0.3, max_tokens: 8192, jsonMode: true,
    });
    let cleaned = rawResponse.trim();
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) cleaned = match[1];
    structure = JSON.parse(cleaned);
  } catch (err) {
    logger.error('TOC Gemini call failed, using fallback', { err });
    await addTextbookLog(textbookId, "[Warning] Gemini TOC call failed. Using default syllabus layout fallback.");
  }
  if (!structure?.chapters?.length) {
    structure = { chapters: [{ title: 'Chapter 1: Core Concepts', order: 1, summary: 'Foundational topics.', concepts: ['1.1 Introduction', '1.2 Key Principles'] }] };
  }
  await supabase.from('chapters').delete().eq('textbook_id', textbookId);
  const chapterRows: Array<{ id: string; textbook_id: string; title: string; order: number; summary: string }> = [];
  const conceptRows: Array<{ id: string; chapter_id: string; textbook_id: string; title: string; order: number }> = [];
  let totalConcepts = 0;
  for (const chap of structure.chapters) {
    const chapterId = uuidv4();
    chapterRows.push({ id: chapterId, textbook_id: textbookId, title: chap.title, order: chap.order || totalConcepts + 1, summary: chap.summary || '' });
    for (let cIdx = 0; cIdx < chap.concepts.length; cIdx++) {
      totalConcepts++;
      conceptRows.push({ id: uuidv4(), chapter_id: chapterId, textbook_id: textbookId, title: chap.concepts[cIdx], order: cIdx + 1 });
    }
  }
  if (chapterRows.length > 0) await supabase.from('chapters').insert(chapterRows);
  if (conceptRows.length > 0) await supabase.from('concepts').insert(conceptRows);
  await supabase.from('textbooks').update({ chapter_count: structure.chapters.length, total_concepts: totalConcepts, updated_at: new Date().toISOString() }).eq('id', textbookId);
  await addTextbookLog(textbookId, `Curriculum layout saved. Created ${structure.chapters.length} chapters and ${totalConcepts} concepts. Starting AI enrichment...`);
  await updateJobProgress(textbookId, 25, 'chapters');

  const { data: chapters } = await supabase.from('chapters').select('id, title').eq('textbook_id', textbookId);
  if (chapters) {
    for (const chap of chapters) {
      const { data: concepts } = await supabase.from('concepts').select('id, title').eq('chapter_id', chap.id);
      if (concepts) {
        for (const conc of concepts) {
          await runConceptPipeline({ textbookId, chapterId: chap.id, conceptId: conc.id, conceptTitle: conc.title, chapterTitle: chap.title });
        }
      }
    }
  }
  logger.info('Upload pipeline complete', { textbookId, totalConcepts });
}

async function runConceptPipeline(jobData: { textbookId: string; chapterId: string; conceptId: string; conceptTitle: string; chapterTitle: string }) {
  const { textbookId, chapterId, conceptId, conceptTitle, chapterTitle } = jobData;
  await addTextbookLog(textbookId, `Starting AI enrichment for concept: "${conceptTitle}"...`);
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { data: allPages } = await supabase.from('raw_pages').select('text').eq('textbook_id', textbookId);
  const matchingPages = (allPages || []).filter((p) => p.text?.toLowerCase().includes(conceptTitle.toLowerCase())).slice(0, 8);
  const contextText = matchingPages.length > 0 ? matchingPages.map((p) => p.text).join('\n') : 'Review curriculum topics.';
  const { data: tb } = await supabase.from('textbooks').select('subject_id').eq('id', textbookId).single();
  const subjectId = tb?.subject_id || '';
  const db = getAdminFirestore();
  const subjectDoc = subjectId ? await db.collection('subjects').doc(subjectId).get().catch(() => null) : null;
  const subjectName = subjectDoc?.data()?.name || 'Education';

  const [notesResult, questionsResult, videosResult, resourcesResult, embeddingResult] = await Promise.allSettled([
    (async () => {
      const prompt = `Read the source text and compile educational notes for the concept: "${conceptTitle}" (under "${chapterTitle}").
Return ONLY valid JSON: { "summary": "", "notes": "", "keyPoints": "", "formulas": "", "examples": "", "learningObjectives": "" }
Context Text:\n${contextText.slice(0, 15000)}`;
      const raw = await chatCompletion({ messages: [{ role: 'system', content: 'You respond in clean JSON only.' }, { role: 'user', content: prompt }], temperature: 0.3, max_tokens: 4096, jsonMode: true });
      let cleaned = raw.trim();
      const m = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (m) cleaned = m[1];
      return JSON.parse(cleaned);
    })(),
    (async () => {
      const prompt = `Generate a comprehensive question bank for: "${conceptTitle}".
Generate exactly 3 questions for EACH type: mcq, true_false, fill_blank, matching, numerical, descriptive
Return ONLY valid JSON: { "questions": [{ "question": "", "type": "", "difficulty": "easy|medium|hard|hots", "options": ["A","B","C","D"], "answer": "", "explanation": "", "passageText": null }] }
Concept: ${conceptTitle} Chapter: ${chapterTitle} Context: ${contextText.slice(0, 8000)}`;
      const raw = await chatCompletion({ messages: [{ role: 'system', content: 'You respond in clean JSON only.' }, { role: 'user', content: prompt }], temperature: 0.4, max_tokens: 16384, jsonMode: true });
      let cleaned = raw.trim();
      const m = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (m) cleaned = m[1];
      return JSON.parse(cleaned);
    })(),
    searchAndRankVideos(conceptTitle, '', subjectName, 1, conceptId),
    matchAndRankResources(conceptTitle, '', 3),
    (async () => { const text = `${conceptTitle}. ${contextText.slice(0, 500)}`.slice(0, 1000); return getEmbedding(text); })(),
  ]);

  const errors: string[] = [];
  const reasonOf = (r: PromiseSettledResult<any>) => r.status === 'rejected' ? (r.reason?.message || String(r.reason)) : 'unknown';

  if (notesResult.status === 'fulfilled' && notesResult.value) {
    const d = notesResult.value;
    await supabase.from('concept_notes').upsert({
      id: conceptId, concept_id: conceptId, textbook_id: textbookId, chapter_id: chapterId,
      summary: d.summary || '', notes: d.notes || '', key_points: d.keyPoints || '',
      formulas: d.formulas || '', examples: d.examples || '', learning_objectives: d.learningObjectives || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id', ignoreDuplicates: false });
  } else { errors.push(`notes: ${reasonOf(notesResult)}`); }

  if (questionsResult.status === 'fulfilled' && questionsResult.value?.questions) {
    const questionRows = questionsResult.value.questions.map((q: any) => ({
      id: uuidv4(), concept_id: conceptId, textbook_id: textbookId, chapter_id: chapterId,
      question: q.question, type: q.type || 'mcq', difficulty: q.difficulty || 'medium',
      options: Array.isArray(q.options) ? q.options : null, answer: q.answer || '',
      explanation: q.explanation || '', passage_text: q.passageText || null,
      created_at: new Date().toISOString(),
    }));
    await supabase.from('concept_questions').insert(questionRows);
  } else { errors.push(`questions: ${reasonOf(questionsResult)}`); }

  if (videosResult.status === 'fulfilled' && Array.isArray(videosResult.value)) {
    const topVideos = videosResult.value;
    const videoRows = topVideos.map((video: any) => ({
      id: uuidv4(), concept_id: conceptId, textbook_id: textbookId, chapter_id: chapterId,
      video_id: video.youtubeId, title: video.title, description: video.description,
      channel: video.channelName, thumbnail: video.thumbnail, duration: video.duration,
      score: video.score || 1.0, embedding: video.embedding || null, created_at: new Date().toISOString(),
    }));
    if (videoRows.length > 0) await supabase.from('concept_videos').insert(videoRows);
    const videoLinks = topVideos.map((v: any) => v.embedUrl || `https://www.youtube.com/watch?v=${v.youtubeId}`);
    await supabase.from('concepts').update({ video_links: videoLinks }).eq('id', conceptId);
  } else { errors.push(`videos: ${reasonOf(videosResult)}`); }

  if (resourcesResult.status === 'fulfilled' && Array.isArray(resourcesResult.value)) {
    const resourceRows = resourcesResult.value.map((r: any) => ({
      id: uuidv4(), concept_id: conceptId, textbook_id: textbookId, chapter_id: chapterId,
      title: r.title, url: r.url, source: r.source, description: r.description,
      score: r.score || 1.0, embedding: r.embedding || null, created_at: new Date().toISOString(),
    }));
    if (resourceRows.length > 0) await supabase.from('concept_resources').insert(resourceRows);
  } else { errors.push(`resources: ${reasonOf(resourcesResult)}`); }

  if (embeddingResult.status === 'fulfilled' && embeddingResult.value) {
    try { await supabase.from('concept_notes').update({ embedding: embeddingResult.value }).eq('id', conceptId); } catch { /* noop */ }
  } else { errors.push(`embedding: ${reasonOf(embeddingResult)}`); }

  const { data: tbData } = await supabase.from('textbooks').select('total_concepts').eq('id', textbookId).single();
  const { data: rpcData, error: rpcError } = await supabase.rpc('increment_completed_concepts', { t_id: textbookId });
  const newCompleted = (rpcData as number) || 0;
  const totalConcepts = (tbData?.total_concepts as number) || 0;

  if (errors.length > 0) {
    await addTextbookLog(textbookId, `[Warning] Concept "${conceptTitle}" completed with issues: ${errors.join('; ')}`);
  } else {
    await addTextbookLog(textbookId, `Completed concept enrichment: "${conceptTitle}"`);
  }

  if (newCompleted >= totalConcepts && totalConcepts > 0) {
    await updateJobProgress(textbookId, 100, 'done', 'COMPLETED');
    await addTextbookLog(textbookId, "Success! Textbook processing completed.");
  } else {
    const progress = Math.round(25 + (newCompleted / Math.max(totalConcepts, 1)) * 75);
    await updateJobProgress(textbookId, progress, 'concepts');
    await addTextbookLog(textbookId, `Enriched concept progress: ${newCompleted} / ${totalConcepts} completed.`);
  }
}

// ── pg-boss workers ──────────────────────────────────────────

export async function startWorkers() {
  const b = await getBoss();
  if (!b) {
    logger.info('pg-boss not available — workers not started (processing will run inline)');
    return;
  }

  await b.work('uploadQueue', async (jobs: any | any[]) => {
    const jobArray = Array.isArray(jobs) ? jobs : [jobs];
    for (const job of jobArray) {
      const { textbookId, storagePath } = job.data;
      try {
        await runUploadPipeline(textbookId, storagePath);
      } catch (err: any) {
        logger.error('pg-boss upload worker failed', { textbookId, err: err.message });
        await updateJobProgress(textbookId, 0, 'done', 'FAILED', err.message);
        throw err;
      }
    }
  });

  await b.work('masteryQueue', async (jobs: any | any[]) => {
    const jobArray = Array.isArray(jobs) ? jobs : [jobs];
    for (const job of jobArray) {
      const { studentId, conceptId, accuracy } = job.data;
      try {
        await computeMasteryInline(studentId, conceptId, accuracy);
      } catch (err: any) {
        logger.error('pg-boss mastery worker failed', { studentId, conceptId, err: err.message });
        throw err;
      }
    }
  });

  logger.info('pg-boss workers registered: uploadQueue, masteryQueue');
}
