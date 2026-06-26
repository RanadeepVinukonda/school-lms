import { Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { getAdminFirestore } from '../firebase/admin';
import admin from 'firebase-admin';
import { getRedisConnection } from '../config/redis';
import { chatCompletion } from '../services/ai.service';
import { getEmbedding } from '../services/transformers.service';
import { searchAndRankVideos } from '../services/video-ranker.service';
import { matchAndRankResources } from '../services/resource-ranker.service';
import { getCloudinaryDownloadUrl } from '../services/cloudinary.service';
import { logger } from '../utils/logger';

const connection = getRedisConnection();

async function addTextbookLog(textbookId: string, message: string) {
  try {
    const db = getAdminFirestore();
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const logEntry = `[${timestamp}] ${message}`;
    await db.collection('textbooks').doc(textbookId).update({
      logs: admin.firestore.FieldValue.arrayUnion(logEntry),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to write textbook log in worker', { textbookId, err });
  }
}

async function getJobDbRefs(textbookId: string) {
  const db = getAdminFirestore();
  const textbookRef = db.collection('textbooks').doc(textbookId);
  const jobRef = db.collection('processingJobs').doc(textbookId);
  return { db, textbookRef, jobRef };
}

async function updateJobProgress(
  textbookId: string,
  progress: number,
  currentStep: string,
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'PROCESSING',
  error: string | null = null
) {
  const { db, textbookRef, jobRef } = await getJobDbRefs(textbookId);
  const now = new Date().toISOString();

  await db.runTransaction(async (t) => {
    const tbDoc = await t.get(textbookRef);
    if (!tbDoc.exists) return;
    const currentStatus = tbDoc.data()?.status;

    // Do not downgrade status from ready/failed back to processing due to race conditions
    if (status === 'PROCESSING' && (currentStatus === 'ready' || currentStatus === 'failed')) {
      return;
    }

    t.set(jobRef, { id: textbookId, status, progress, currentStep, error, updatedAt: now }, { merge: true });

    if (status === 'COMPLETED') {
      t.update(textbookRef, { status: 'ready', updatedAt: now, failureReason: null });
    } else if (status === 'FAILED') {
      t.update(textbookRef, { status: 'failed', failureReason: error || 'Unknown pipeline failure', updatedAt: now });
    } else {
      t.update(textbookRef, { status: 'processing', updatedAt: now });
    }
  });
}

// ──────────────────────────────────────────────────────────────
// 1. UPLOAD WORKER  —  PDF parse → Gemini TOC → save structure
// ──────────────────────────────────────────────────────────────
const uploadWorker = new Worker(
  'uploadQueue',
  async (job: Job) => {
    const { textbookId, storagePath } = job.data;

    logger.info('uploadWorker: Starting PDF extraction and TOC planning', { textbookId });

    const db = getAdminFirestore();
    const textbookDoc = await db.collection('textbooks').doc(textbookId).get();
    const pdfUrl = textbookDoc.data()?.pdfUrl;
    if (!pdfUrl) throw new Error('PDF URL not found for textbook');

    await db.collection('textbooks').doc(textbookId).update({ logs: [] });
    await addTextbookLog(textbookId, "Downloading textbook PDF from Cloudinary...");
    await updateJobProgress(textbookId, 5, 'extract_text');

    // Download PDF
    const signedUrl = await getCloudinaryDownloadUrl(storagePath);
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error(`Failed to download PDF: ${response.statusText}`);
    const pdfBuffer = Buffer.from(await response.arrayBuffer());

    await addTextbookLog(textbookId, "PDF downloaded. Extracting text content page by page...");

    // Parse PDF page by page
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: pdfBuffer });
    const pageTexts: string[] = [];
    try {
      const parsed = await parser.getText();
      const sortedPages = [...(parsed.pages || [])].sort((a, b) => a.num - b.num);
      for (const page of sortedPages) {
        pageTexts.push(page.text || '');
      }
    } finally {
      await parser.destroy();
    }

    if (pageTexts.length === 0 || pageTexts.every(t => !t.trim())) {
      throw new Error('PDF yielded no readable text');
    }

    await addTextbookLog(textbookId, `PDF parsed successfully. Total pages: ${pageTexts.length}.`);
    await updateJobProgress(textbookId, 10, 'extract_text');

    // Save raw pages to Firestore
    const textbookRef = db.collection('textbooks').doc(textbookId);
    const rawPagesColl = textbookRef.collection('rawPages');

    const oldPages = await rawPagesColl.get();
    const clearBatch = db.batch();
    oldPages.docs.forEach((d) => clearBatch.delete(d.ref));
    await clearBatch.commit();

    let writeBatch = db.batch();
    for (let i = 0; i < pageTexts.length; i++) {
      const ref = rawPagesColl.doc(`page_${i + 1}`);
      writeBatch.set(ref, { pageNum: i + 1, text: pageTexts[i], createdAt: new Date().toISOString() });
      if ((i + 1) % 100 === 0) { await writeBatch.commit(); writeBatch = db.batch(); }
    }
    await writeBatch.commit();

    logger.info('uploadWorker: Raw text saved', { textbookId, totalPages: pageTexts.length });

    await updateJobProgress(textbookId, 15, 'chapters');
    await addTextbookLog(textbookId, "Analyzing syllabus layout and extracting Table of Contents (TOC) with Gemini AI...");

    // ── Gemini TOC Planning ──────────────────────────────
    const textbookData = textbookDoc.data()!;
    const title = textbookData.title || 'Textbook';
    const tocText = pageTexts.slice(0, 15).join('\n').slice(0, 35000);

    let structure: { chapters: Array<{ title: string; order: number; summary: string; concepts: string[] }> } | null = null;

    try {
      const prompt = `You are a professional syllabus compiler. Read this textbook's opening pages and generate a clean curriculum outline for "${title}".
Return ONLY valid JSON matching this schema (no markdown, no formatting):
{
  "chapters": [
    {
      "title": "Chapter title",
      "order": 1,
      "summary": "Short chapter description",
      "concepts": ["1.1 First Concept Name", "1.2 Second Concept Name"]
    }
  ]
}
Textbook content:
${tocText}`;

      const rawResponse = await chatCompletion({
        messages: [
          { role: 'system', content: 'You respond in valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 8192,
        jsonMode: true,
      });

      let cleaned = rawResponse.trim();
      const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleaned = match[1];
      
      structure = JSON.parse(cleaned);
    } catch (err) {
      logger.error('uploadWorker: TOC Gemini call failed, using fallback structure', { err });
      await addTextbookLog(textbookId, "[Warning] Gemini TOC call failed. Using default syllabus layout fallback.");
    }

    if (!structure || !structure.chapters || structure.chapters.length === 0) {
      structure = {
        chapters: [
          { title: 'Chapter 1: Core Concepts', order: 1, summary: 'Foundational topics.', concepts: ['1.1 Introduction', '1.2 Key Principles'] },
          { title: 'Chapter 2: Advanced Topics', order: 2, summary: 'In-depth coverage.', concepts: ['2.1 Advanced Theory', '2.2 Practical Applications'] },
        ],
      };
    }

    // Clear old chapters
    const oldChaps = await textbookRef.collection('chapters').get();
    for (const d of oldChaps.docs) { await d.ref.delete(); }

    // Write new chapters + concepts, count total concepts
    let totalConcepts = 0;
    for (const chap of structure.chapters) {
      const chapterId = uuidv4();
      const chapterRef = textbookRef.collection('chapters').doc(chapterId);
      await chapterRef.set({
        id: chapterId, title: chap.title, order: chap.order || totalConcepts + 1, summary: chap.summary || '',
      });

      for (let cIdx = 0; cIdx < chap.concepts.length; cIdx++) {
        totalConcepts++;
        const conceptId = uuidv4();
        await chapterRef.collection('concepts').doc(conceptId).set({
          id: conceptId, title: chap.concepts[cIdx], order: cIdx + 1, videoLinks: [],
        });
      }
    }

    // Set totalConcepts BEFORE enqueueing concept jobs
    await textbookRef.update({ chapterCount: structure.chapters.length, totalConcepts, updatedAt: new Date().toISOString() });
    await addTextbookLog(textbookId, `Curriculum layout saved. Created ${structure.chapters.length} chapters and ${totalConcepts} concepts. Starting AI enrichment...`);

    await updateJobProgress(textbookId, 25, 'chapters');

    // Enqueue one concept job per concept
    const { conceptQueue } = require('./queue');
    const chaptersSnap = await textbookRef.collection('chapters').get();
    const conceptJobs: Array<{ name: string; data: any; opts: any }> = [];

    for (const chapDoc of chaptersSnap.docs) {
      const chapterData = chapDoc.data();
      const conceptsSnap = await chapDoc.ref.collection('concepts').get();
      for (const concDoc of conceptsSnap.docs) {
        const conceptData = concDoc.data();
        conceptJobs.push({
          name: 'process-concept',
          data: {
            textbookId,
            chapterId: chapDoc.id,
            conceptId: concDoc.id,
            conceptTitle: conceptData.title,
            chapterTitle: chapterData.title,
          },
          opts: {
            jobId: `concept_${concDoc.id}`,
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
          },
        });
      }
    }

    // Add in batches to avoid overwhelming the queue
    const BATCH_SIZE = 10;
    for (let i = 0; i < conceptJobs.length; i += BATCH_SIZE) {
      const batch = conceptJobs.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((cj) => conceptQueue.add(cj.name, cj.data, cj.opts)));
    }

    logger.info('uploadWorker: Pipeline complete — concept jobs enqueued', {
      textbookId, totalConcepts, chapterCount: structure.chapters.length,
    });
  },
  { connection, lockDuration: 300000 }
);

// ──────────────────────────────────────────────────────────────
// 2. CONCEPT WORKER  —  Promise.all for notes, questions,
//                       videos, resources, embedding
// ──────────────────────────────────────────────────────────────
const conceptWorker = new Worker(
  'conceptQueue',
  async (job: Job) => {
    const { textbookId, chapterId, conceptId, conceptTitle, chapterTitle } = job.data;
    await addTextbookLog(textbookId, `Starting AI enrichment for concept: "${conceptTitle}"...`);
    logger.info('conceptWorker: Starting parallel enrichment', { conceptId, conceptTitle });

    const db = getAdminFirestore();

    // ── Gather context ──────────────────────────────────────
    const pagesSnap = await db.collection('textbooks').doc(textbookId).collection('rawPages').get();
    const allPages = pagesSnap.docs.map((d) => d.data());
    const matchingPages = allPages
      .filter((p: any) => p.text?.toLowerCase().includes(conceptTitle.toLowerCase()))
      .slice(0, 8);
    const contextText = matchingPages.length > 0
      ? matchingPages.map((p: any) => p.text).join('\n')
      : 'Review curriculum topics.';

    // Get subject name for video search
    const textbookDoc = await db.collection('textbooks').doc(textbookId).get();
    const subjectId = textbookDoc.data()?.subjectId || '';
    const subjectDoc = subjectId ? await db.collection('subjects').doc(subjectId).get() : null;
    const subjectName = subjectDoc?.data()?.name || 'Education';

    // ── Run 5 tasks in parallel ────────────────────────────
    const [notesResult, questionsResult, videosResult, resourcesResult, embeddingResult] = await Promise.allSettled([
      // Task 1 — Study Notes, Summary, Key Points, Formulas, Examples, Learning Objectives
      (async () => {
        const prompt = `Read the source text and compile educational notes for the concept: "${conceptTitle}" (under "${chapterTitle}").
Return ONLY valid JSON matching this schema:
{
  "summary": "String summary of this concept",
  "notes": "Detailed markdown study notes. Include 3+ rich paragraphs explaining principles and rules.",
  "keyPoints": "Markdown list of key terms and rules",
  "formulas": "Markdown list of formulas (use LaTeX like $E=mc^2$ if applicable)",
  "examples": "Markdown list of solved examples or applications",
  "learningObjectives": "Markdown list of learning objectives"
}
Context Text:
${contextText.slice(0, 15000)}`;

        const raw = await chatCompletion({
          messages: [
            { role: 'system', content: 'You respond in clean JSON only.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
          jsonMode: true,
        });
        
        let cleaned = raw.trim();
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) cleaned = match[1];
        
        return JSON.parse(cleaned);
      })(),

      // Task 2 — Question Bank (12 types in one call)
      (async () => {
        const prompt = `Generate a comprehensive question bank for: "${conceptTitle}".

Generate exactly 1 question for EACH of these types:
mcq, fill_blank, true_false, matching, descriptive, numerical, passage, assertion_reason, case_study, application_based, hots, short_answer

Return ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "question": "The question text",
      "type": "one of the types above",
      "difficulty": "easy|medium|hard|hots",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct answer",
      "explanation": "Brief reasoning",
      "passageText": "Passage context (only for passage or case_study)"
    }
  ]
}

Concept: ${conceptTitle}
Chapter: ${chapterTitle}
Context: ${contextText.slice(0, 8000)}`;

        const raw = await chatCompletion({
          messages: [
            { role: 'system', content: 'You respond in clean JSON only.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 8192,
          jsonMode: true,
        });
        
        let cleaned = raw.trim();
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) cleaned = match[1];
        
        return JSON.parse(cleaned);
      })(),

      // Task 3 — YouTube video search + rank
      (async () => {
        return searchAndRankVideos(conceptTitle, '', subjectName, 3);
      })(),

      // Task 4 — Curated resource matching + rank
      (async () => {
        return matchAndRankResources(conceptTitle, '', 3);
      })(),

      // Task 5 — Local vector embedding
      (async () => {
        const textToEmbed = `${conceptTitle}. ${contextText.slice(0, 500)}`.slice(0, 1000);
        return getEmbedding(textToEmbed);
      })(),
    ]);

    // ── Save results ───────────────────────────────────────
    const errors: string[] = [];

    function reasonOf(r: PromiseSettledResult<any>): string {
      return r.status === 'rejected' ? (r.reason?.message || String(r.reason)) : 'unknown';
    }

    // Save Notes
    if (notesResult.status === 'fulfilled' && notesResult.value) {
      const data = notesResult.value;
      await db.collection('conceptNotes').doc(conceptId).set({
        id: conceptId, conceptId, textbookId, chapterId,
        summary: data.summary || '',
        notes: data.notes || '',
        keyPoints: data.keyPoints || '',
        formulas: data.formulas || '',
        examples: data.examples || '',
        learningObjectives: data.learningObjectives || '',
        updatedAt: new Date().toISOString(),
      });
    } else {
      const msg = reasonOf(notesResult);
      errors.push(`notes: ${msg}`);
      logger.error('conceptWorker: Notes generation failed', { conceptId, err: msg });
    }

    // Save Questions
    if (questionsResult.status === 'fulfilled' && questionsResult.value?.questions) {
      const questions = questionsResult.value.questions;
      const questionsColl = db.collection('conceptQuestions');
      for (const q of questions) {
        const qId = uuidv4();
        await questionsColl.doc(qId).set({
          id: qId, conceptId, textbookId, chapterId,
          question: q.question, type: q.type || 'mcq',
          difficulty: q.difficulty || 'medium',
          options: Array.isArray(q.options) ? q.options : null,
          answer: q.answer || '',
          explanation: q.explanation || '',
          passageText: q.passageText || null,
          createdAt: new Date().toISOString(),
        });
      }
      logger.info('conceptWorker: Questions saved', { conceptId, count: questions.length });
    } else {
      const msg = reasonOf(questionsResult);
      errors.push(`questions: ${msg}`);
      logger.error('conceptWorker: Question bank generation failed', { conceptId, err: msg });
    }

    // Save Videos
    if (videosResult.status === 'fulfilled' && Array.isArray(videosResult.value)) {
      const topVideos = videosResult.value;
      const videosColl = db.collection('conceptVideos');
      const videoLinks: string[] = [];
      for (const video of topVideos) {
        const videoId = uuidv4();
        await videosColl.doc(videoId).set({
          id: videoId, conceptId, textbookId, chapterId,
          videoId: video.youtubeId, title: video.title, description: video.description,
          channel: video.channelName, thumbnail: video.thumbnail, duration: video.duration,
          score: video.score || 1.0, embedding: video.embedding || null,
          createdAt: new Date().toISOString(),
        });
        videoLinks.push(video.embedUrl || `https://www.youtube.com/watch?v=${video.youtubeId}`);
      }

      const conceptRef = db.collection('textbooks').doc(textbookId)
        .collection('chapters').doc(chapterId)
        .collection('concepts').doc(conceptId);
      await conceptRef.update({ videoLinks });
    } else {
      const msg = reasonOf(videosResult);
      errors.push(`videos: ${msg}`);
      logger.error('conceptWorker: Video search failed', { conceptId, err: msg });
    }

    // Save Resources
    if (resourcesResult.status === 'fulfilled' && Array.isArray(resourcesResult.value)) {
      const resources = resourcesResult.value;
      const resourcesColl = db.collection('conceptResources');
      for (const resource of resources) {
        const resourceId = uuidv4();
        await resourcesColl.doc(resourceId).set({
          id: resourceId, conceptId, textbookId, chapterId,
          title: resource.title, url: resource.url, source: resource.source,
          description: resource.description, score: resource.score || 1.0,
          embedding: resource.embedding || null, createdAt: new Date().toISOString(),
        });
      }
    } else {
      const msg = reasonOf(resourcesResult);
      errors.push(`resources: ${msg}`);
      logger.error('conceptWorker: Resource matching failed', { conceptId, err: msg });
    }

    // Save Embedding on conceptNotes doc
    if (embeddingResult.status === 'fulfilled' && embeddingResult.value) {
      try {
        await db.collection('conceptNotes').doc(conceptId).update({ embedding: embeddingResult.value });
      } catch {
        // conceptNotes doc might not exist if notes task failed — that's fine
      }
    } else {
      const msg = reasonOf(embeddingResult);
      errors.push(`embedding: ${msg}`);
      logger.error('conceptWorker: Embedding failed', { conceptId, err: msg });
    }

    // ── Increment completed counter & finalize if last ────
    const textbookRef = db.collection('textbooks').doc(textbookId);
    await textbookRef.update({
      completedConcepts: admin.firestore.FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await textbookRef.get();
    const totalConcepts = updatedDoc.data()?.totalConcepts || 0;
    const completedCount = updatedDoc.data()?.completedConcepts || 0;

    if (errors.length > 0) {
      logger.warn('conceptWorker: Completed with partial failures', { conceptId, errors: errors.join('; ') });
      await addTextbookLog(textbookId, `[Warning] Concept "${conceptTitle}" completed with issues: ${errors.join('; ')}`);
    } else {
      await addTextbookLog(textbookId, `Completed concept enrichment: "${conceptTitle}"`);
    }

    if (completedCount >= totalConcepts && totalConcepts > 0) {
      logger.info('conceptWorker: All concepts completed — marking textbook ready', { textbookId });
      await updateJobProgress(textbookId, 100, 'done', 'COMPLETED');
      await addTextbookLog(textbookId, "Success! Textbook processing completed. Reloading database view...");
    } else {
      // Calculate progress: 25% + (completed / total) * 75%
      const progress = Math.round(25 + (completedCount / Math.max(totalConcepts, 1)) * 75);
      await updateJobProgress(textbookId, progress, 'concepts');
      await addTextbookLog(textbookId, `Enriched concept progress: ${completedCount} / ${totalConcepts} completed.`);
    }
  },
  { connection, lockDuration: 300000, concurrency: 2 }
);

// ── Global failure handler ─────────────────────────────────────
const logFailure = (queueName: string) => {
  return async (job: Job | undefined, err: Error) => {
    logger.error(`Worker job failed on queue "${queueName}"`, { jobId: job?.id, error: err.message });
    if (job?.data?.textbookId) {
      await updateJobProgress(job.data.textbookId, 0, 'done', 'FAILED', err.message);
    }
  };
};

uploadWorker.on('failed', logFailure('uploadQueue'));
conceptWorker.on('failed', logFailure('conceptQueue'));

logger.info('BullMQ workers initialized: uploadQueue, conceptQueue');
