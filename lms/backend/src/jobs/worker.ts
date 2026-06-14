import { Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { getAdminFirestore } from '../firebase/admin';
// import { getBucket } from '../firebase/storage'; // Removed unused Firebase storage import
import { getRedisConnection } from '../config/redis';
import { chatCompletion } from '../services/ai.service';
import { getEmbedding } from '../services/transformers.service';
import { searchAndRankVideos } from '../services/video-ranker.service';
import { matchAndRankResources } from '../services/resource-ranker.service';
import { logger } from '../utils/logger';

// Delay helper to respect API rate limits on free-tier keys
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const connection = getRedisConnection();

/**
 * UTILITY: Update the textbook and job progress in Firestore
 */
async function updateJobProgress(
  textbookId: string,
  progress: number,
  currentStep: string,
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'PROCESSING',
  error: string | null = null
) {
  const db = getAdminFirestore();
  const jobRef = db.collection('processingJobs').doc(textbookId);
  const textbookRef = db.collection('textbooks').doc(textbookId);

  const now = new Date().toISOString();
  
  await jobRef.set({
    id: textbookId,
    status,
    progress,
    currentStep,
    error,
    updatedAt: now,
  }, { merge: true });

  if (status === 'COMPLETED') {
    await textbookRef.update({ status: 'ready', updatedAt: now, failureReason: null });
  } else if (status === 'FAILED') {
    await textbookRef.update({ status: 'failed', failureReason: error || 'Unknown pipeline failure', updatedAt: now });
  } else {
    await textbookRef.update({ status: 'processing', updatedAt: now });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. UPLOAD WORKER
// ──────────────────────────────────────────────────────────────────────────────
const uploadWorker = new Worker(
  'uploadQueue',
  async (job: Job) => {
    const { textbookId, storagePath } = job.data;
    logger.info('uploadWorker: Starting text extraction', { textbookId });
    await updateJobProgress(textbookId, 10, 'extract_text');

    const db = getAdminFirestore();
    // Retrieve the textbook doc to get the Cloudinary PDF URL
    const textbookDoc = await db.collection('textbooks').doc(textbookId).get();
    const pdfUrl = textbookDoc.data()?.pdfUrl;
    if (!pdfUrl) {
      throw new Error('PDF URL not found for textbook');
    }
    // Download the PDF into a buffer using fetch (node-fetch builtin in Node 18+)
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF from Cloudinary: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Parse PDF page by page using pdf-parse hook
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const pageTexts: string[] = [];

    await pdfParse(pdfBuffer, {
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          const text = textContent.items.map((i: any) => i.str).join(' ');
          pageTexts.push(text);
          return text;
        });
      },
    });

    if (pageTexts.length === 0) {
      throw new Error('PDF extracted successfully but yielded no readable text.');
    }

    // Save pages to rawPages subcollection
    const textbookRef = db.collection('textbooks').doc(textbookId);
    const rawPagesColl = textbookRef.collection('rawPages');
    
    // Clear any old raw pages
    const oldPages = await rawPagesColl.get();
    const batch = db.batch();
    oldPages.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // Write new pages in batches of 100
    let writeBatch = db.batch();
    for (let i = 0; i < pageTexts.length; i++) {
      const pageNum = i + 1;
      const ref = rawPagesColl.doc(`page_${pageNum}`);
      writeBatch.set(ref, {
        pageNum,
        text: pageTexts[i],
        createdAt: new Date().toISOString(),
      });

      if (pageNum % 100 === 0) {
        await writeBatch.commit();
        writeBatch = db.batch();
      }
    }
    await writeBatch.commit();

    logger.info('uploadWorker: Finished page-by-page raw text extraction', {
      textbookId,
      totalPages: pageTexts.length,
    });

    // Enqueue the chapter worker job next
    const { chapterQueue } = require('./queue');
    await chapterQueue.add(
      'extract-chapters',
      { textbookId },
      { jobId: `chapter_${textbookId}`, removeOnComplete: true }
    );

    await updateJobProgress(textbookId, 25, 'chapters');
  },
  { connection }
);

// ──────────────────────────────────────────────────────────────────────────────
// 2. CHAPTER WORKER
// ──────────────────────────────────────────────────────────────────────────────
const chapterWorker = new Worker(
  'chapterQueue',
  async (job: Job) => {
    const { textbookId } = job.data;
    logger.info('chapterWorker: Extracting chapter structure', { textbookId });
    await updateJobProgress(textbookId, 30, 'chapters');

    const db = getAdminFirestore();
    const pagesSnap = await db.collection('textbooks').doc(textbookId).collection('rawPages').get();
    const pages = pagesSnap.docs.map((d) => d.data()).sort((a, b) => a.pageNum - b.pageNum);

    // Concat first 12 pages to find the Table of Contents (TOC)
    const tocText = pages
      .slice(0, 12)
      .map((p) => p.text)
      .join('\n');

    // Attempt simple regex for chapter outlines
    let structure: { chapters: Array<{ title: string; order: number; summary: string; concepts: string[] }> } | null = null;

    try {
      const prompt = `You are a professional syllabus compiler. Read this Table of Contents text and generate a clean curriculum outline.
Return ONLY valid JSON matching this schema (do not output any markdown formatting, just the raw string):
{
  "chapters": [
    {
      "title": "Chapter title",
      "order": 1,
      "summary": "Short chapter description",
      "concepts": [
        "1.1 First Concept Name",
        "1.2 Second Concept Name"
      ]
    }
  ]
}
Textbook TOC context:
${tocText.slice(0, 30000)}`;

      await delay(1000); // respects free key RPM limits
      const rawResponse = await chatCompletion({
        model: 'gemini-2.0-flash',
        messages: [
          { role: 'system', content: 'You respond in valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });

      // Strip potential markdown wrappers if any
      const cleanedResponse = rawResponse.trim().replace(/^```json/, '').replace(/```$/, '').trim();
      structure = JSON.parse(cleanedResponse);
    } catch (err) {
      logger.error('chapterWorker: Failed to compile outline via LLM. Falling back to mock curriculum structure.', { err });
      // Fallback fallback outline if prompt fails
      structure = {
        chapters: [
          { title: 'Chapter 1: Foundations', order: 1, summary: 'Basics and core principles.', concepts: ['1.1 Core Principles', '1.2 Fundamental Theories'] },
          { title: 'Chapter 2: Advanced Topics', order: 2, summary: 'Detailed analyses and implementations.', concepts: ['2.1 Structural Analysis', '2.2 Real-world Systems'] },
        ],
      };
    }

    if (!structure || !structure.chapters || structure.chapters.length === 0) {
      throw new Error('Chapter extraction failed to construct a valid syllabus outline.');
    }

    const textbookRef = db.collection('textbooks').doc(textbookId);
    
    // Clear old chapters/concepts if any
    const oldChaps = await textbookRef.collection('chapters').get();
    for (const doc of oldChaps.docs) {
      await doc.ref.delete();
    }

    // Write new structural documents
    let totalChapters = 0;
    const { conceptQueue } = require('./queue');

    for (const chap of structure.chapters) {
      const chapterId = uuidv4();
      const chapterRef = textbookRef.collection('chapters').doc(chapterId);

      await chapterRef.set({
        id: chapterId,
        title: chap.title,
        order: chap.order || totalChapters + 1,
        summary: chap.summary || '',
      });
      totalChapters++;

      // Dispatch concepts individually for background notes + questions compilation
      for (let cIdx = 0; cIdx < chap.concepts.length; cIdx++) {
        const conceptTitle = chap.concepts[cIdx];
        const conceptId = uuidv4();
        
        await chapterRef.collection('concepts').doc(conceptId).set({
          id: conceptId,
          title: conceptTitle,
          order: cIdx + 1,
          videoLinks: [],
        });

        // Trigger concept execution job
        await conceptQueue.add(
          'process-concept',
          { textbookId, chapterId, conceptId, conceptTitle, chapterTitle: chap.title },
          { jobId: `concept_${conceptId}`, removeOnComplete: true }
        );
      }
    }

    await textbookRef.update({ chapterCount: totalChapters });
    await updateJobProgress(textbookId, 45, 'concepts');
  },
  { connection }
);

// ──────────────────────────────────────────────────────────────────────────────
// 3. CONCEPT WORKER (Generates Notes, Summaries, Formulas)
// ──────────────────────────────────────────────────────────────────────────────
const conceptWorker = new Worker(
  'conceptQueue',
  async (job: Job) => {
    const { textbookId, chapterId, conceptId, conceptTitle, chapterTitle } = job.data;
    logger.info('conceptWorker: Compiling detailed study notes', { conceptId, conceptTitle });

    const db = getAdminFirestore();

    // Query context text around this concept name
    const pagesSnap = await db.collection('textbooks').doc(textbookId).collection('rawPages').get();
    const pages = pagesSnap.docs.map((d) => d.data());
    
    // Simple window match: find pages containing concept name to restrict prompt size
    const matchingPages = pages
      .filter((p) => p.text.toLowerCase().includes(conceptTitle.toLowerCase()))
      .slice(0, 10);
      
    const contextText = matchingPages.length > 0 
      ? matchingPages.map((p) => p.text).join('\n') 
      : 'Review curriculum topics';

    // Call Gemini to generate formatted study notes
    await delay(3000); // 3 sec throttles prevent free tier RPM blocks
    
    const prompt = `Read the source text and compile educational notes for the concept: "${conceptTitle}" (under "${chapterTitle}").
Return ONLY valid JSON matching this schema:
{
  "summary": "String summary of this concept",
  "notes": "Detailed markdown study notes. Include 3+ rich paragraphs explaining principles and rules.",
  "keyPoints": "Markdown list of key terms and rules",
  "formulas": "Markdown list of scientific or math formulas (use LaTeX format like $E=mc^2$ if applicable)",
  "examples": "Markdown list of solved examples or applications",
  "learningObjectives": "Markdown list of learning objectives"
}

Context Text:
${contextText.slice(0, 15000)}`;

    const rawResponse = await chatCompletion({
      model: 'gemini-2.0-flash',
      messages: [
        { role: 'system', content: 'You respond in clean JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const cleaned = rawResponse.trim().replace(/^```json/, '').replace(/```$/, '').trim();
    const data = JSON.parse(cleaned);

    // Save to conceptNotes collection
    await db.collection('conceptNotes').doc(conceptId).set({
      id: conceptId,
      conceptId,
      textbookId,
      chapterId,
      summary: data.summary || '',
      notes: data.notes || '',
      keyPoints: data.keyPoints || '',
      formulas: data.formulas || '',
      examples: data.examples || '',
      learningObjectives: data.learningObjectives || '',
      updatedAt: new Date().toISOString(),
    });

    // Enqueue questions generation next
    const { questionQueue } = require('./queue');
    await questionQueue.add(
      'process-questions',
      { textbookId, chapterId, conceptId, conceptTitle, conceptSummary: data.summary },
      { jobId: `questions_${conceptId}`, removeOnComplete: true }
    );
  },
  { connection }
);

// ──────────────────────────────────────────────────────────────────────────────
// 4. QUESTION WORKER (Generates Question Bank covering 12 Types)
// ──────────────────────────────────────────────────────────────────────────────
const questionWorker = new Worker(
  'questionQueue',
  async (job: Job) => {
    const { textbookId, chapterId, conceptId, conceptTitle, conceptSummary } = job.data;
    logger.info('questionWorker: Generating multi-variety questions', { conceptId, conceptTitle });

    const db = getAdminFirestore();

    // Split generation into 2 distinct batches to keep prompt limits clean and stable
    const batches = [
      ['mcq', 'fill_blank', 'true_false', 'matching', 'descriptive', 'numerical'],
      ['passage', 'assertion_reason', 'case_study', 'application_based', 'hots', 'one_word', 'short_answer', 'long_answer'],
    ];

    const questions: any[] = [];

    for (let bIdx = 0; bIdx < batches.length; bIdx++) {
      const types = batches[bIdx];
      await delay(4000); // Prevents free API RPM limits

      const prompt = `Compile a structured list of study questions for: "${conceptTitle}".
Generate exactly 1 question for EACH of these types: ${types.join(', ')}.

Return ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "question": "The question text",
      "type": "one of the types requested",
      "difficulty": "easy|medium|hard|hots",
      "options": ["Option A", "Option B", "Option C", "Option D"], (only for mcq, true_false, matching, passage, assertion_reason)
      "answer": "The correct option text or answer string",
      "explanation": "Brief reasoning explaining why this is correct",
      "passageText": "The passage context (only for passage or case_study type)"
    }
  ]
}

Concept summary: ${conceptSummary}`;

      try {
        const rawResponse = await chatCompletion({
          model: 'gemini-2.0-flash',
          messages: [
            { role: 'system', content: 'You respond in clean JSON only.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
        });

        const cleaned = rawResponse.trim().replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed.questions)) {
          questions.push(...parsed.questions);
        }
      } catch (err) {
        logger.error('questionWorker: Failed to generate batch', { types, err });
      }
    }

    // Save questions in Firestore
    const questionsColl = db.collection('conceptQuestions');
    for (const q of questions) {
      const qId = uuidv4();
      await questionsColl.doc(qId).set({
        id: qId,
        conceptId,
        textbookId,
        chapterId,
        question: q.question,
        type: q.type || 'mcq',
        difficulty: q.difficulty || 'medium',
        options: Array.isArray(q.options) ? q.options : null,
        answer: q.answer || '',
        explanation: q.explanation || '',
        passageText: q.passageText || null,
        createdAt: new Date().toISOString(),
      });
    }

    logger.info('questionWorker: Successfully generated question bank', {
      conceptId,
      totalGenerated: questions.length,
    });

    // Enqueue video matching next
    const { videoQueue } = require('./queue');
    await videoQueue.add(
      'process-videos',
      { textbookId, chapterId, conceptId, conceptTitle, conceptSummary },
      { jobId: `videos_${conceptId}`, removeOnComplete: true }
    );
  },
  { connection }
);

// ──────────────────────────────────────────────────────────────────────────────
// 5. VIDEO WORKER (YouTube Search & Embedding Cosine Alignment)
// ──────────────────────────────────────────────────────────────────────────────
const videoWorker = new Worker(
  'videoQueue',
  async (job: Job) => {
    const { textbookId, chapterId, conceptId, conceptTitle, conceptSummary } = job.data;
    logger.info('videoWorker: Aligning YouTube video assets', { conceptId, conceptTitle });

    const db = getAdminFirestore();

    // Retrieve subject details for query context
    const textbookDoc = await db.collection('textbooks').doc(textbookId).get();
    const subjectId = textbookDoc.data()?.subjectId || '';
    const subjectDoc = await db.collection('subjects').doc(subjectId).get();
    const subjectName = subjectDoc.data()?.name || 'Education';

    const topVideos = await searchAndRankVideos(conceptTitle, conceptSummary, subjectName, 3);

    const videosColl = db.collection('conceptVideos');
    const videoLinks: string[] = [];

    for (const video of topVideos) {
      const videoId = uuidv4();
      await videosColl.doc(videoId).set({
        id: videoId,
        conceptId,
        textbookId,
        chapterId,
        videoId: video.youtubeId,
        title: video.title,
        description: video.description,
        channel: video.channelName,
        thumbnail: video.thumbnail,
        duration: video.duration,
        score: video.score || 1.0,
        embedding: video.embedding || null,
        createdAt: new Date().toISOString(),
      });

      videoLinks.push(video.embedUrl);
    }

    // Update the concept document with video link hooks
    const conceptRef = db
      .collection('textbooks')
      .doc(textbookId)
      .collection('chapters')
      .doc(chapterId)
      .collection('concepts')
      .doc(conceptId);

    await conceptRef.update({ videoLinks });

    // Enqueue static resource matching next
    const { resourceQueue } = require('./queue');
    await resourceQueue.add(
      'process-resources',
      { textbookId, chapterId, conceptId, conceptTitle, conceptSummary },
      { jobId: `resources_${conceptId}`, removeOnComplete: true }
    );
  },
  { connection }
);

// ──────────────────────────────────────────────────────────────────────────────
// 6. RESOURCE WORKER (MIT OCW, Khan Academy, GeeksforGeeks Alignment)
// ──────────────────────────────────────────────────────────────────────────────
const resourceWorker = new Worker(
  'resourceQueue',
  async (job: Job) => {
    const { textbookId, chapterId, conceptId, conceptTitle, conceptSummary } = job.data;
    logger.info('resourceWorker: Scoring static references', { conceptId, conceptTitle });

    const db = getAdminFirestore();
    const rankedResources = await matchAndRankResources(conceptTitle, conceptSummary, 3);

    const resourcesColl = db.collection('conceptResources');

    for (const resource of rankedResources) {
      const resourceId = uuidv4();
      await resourcesColl.doc(resourceId).set({
        id: resourceId,
        conceptId,
        textbookId,
        chapterId,
        title: resource.title,
        url: resource.url,
        source: resource.source,
        description: resource.description,
        score: resource.score || 1.0,
        embedding: resource.embedding || null,
        createdAt: new Date().toISOString(),
      });
    }

    // Enqueue final embedding/indexing job
    const { embeddingQueue } = require('./queue');
    await embeddingQueue.add(
      'finalize-concept',
      { textbookId, chapterId, conceptId, conceptTitle, conceptSummary },
      { jobId: `finalize_${conceptId}`, removeOnComplete: true }
    );
  },
  { connection }
);

// ──────────────────────────────────────────────────────────────────────────────
// 7. EMBEDDING WORKER (Aggregates, Indexes, and Finalizes Status)
// ──────────────────────────────────────────────────────────────────────────────
const embeddingWorker = new Worker(
  'embeddingQueue',
  async (job: Job) => {
    const { textbookId, conceptId, conceptTitle, conceptSummary } = job.data;
    logger.info('embeddingWorker: Finalizing and creating vector maps', { conceptId });

    const db = getAdminFirestore();

    try {
      // Create vector map of concept details for recommendations and search
      const textToEmbed = `${conceptTitle}. ${conceptSummary}`.slice(0, 1000);
      const vector = await getEmbedding(textToEmbed);

      // Save vector metadata on the concept notes
      await db.collection('conceptNotes').doc(conceptId).update({
        embedding: vector,
      });
    } catch (err) {
      logger.error('embeddingWorker: Failed to compute final vector representations', { conceptId, err });
    }

    // Perform check: if this was the last concept of the textbook, finalize progress to 100
    const jobSnap = await db.collection('processingJobs').doc(textbookId).get();
    const currentProgress = jobSnap.data()?.progress || 45;
    
    // Safely step progress up dynamically towards completion
    const nextProgress = Math.min(currentProgress + 10, 95);
    await updateJobProgress(textbookId, nextProgress, 'concepts');

    // Query pending jobs for this textbook to verify pipeline complete
    const textbookRef = db.collection('textbooks').doc(textbookId);
    const chapters = await textbookRef.collection('chapters').get();
    
    let totalConceptsCount = 0;
    for (const chap of chapters.docs) {
      const concepts = await chap.ref.collection('concepts').get();
      totalConceptsCount += concepts.docs.length;
    }

    const processedNotes = await db
      .collection('conceptNotes')
      .where('textbookId', '==', textbookId)
      .get();

    if (processedNotes.docs.length >= totalConceptsCount && totalConceptsCount > 0) {
      logger.info('embeddingWorker: All concepts processed. Marking pipeline complete.', { textbookId });
      await updateJobProgress(textbookId, 100, 'done', 'COMPLETED');
    }
  },
  { connection }
);

// Global Error Handler Logger for Workers
const logFailure = (queueName: string) => {
  return async (job: Job | undefined, err: Error) => {
    logger.error(`Worker job failed on queue "${queueName}"`, {
      jobId: job?.id,
      error: err.message,
    });
    if (job?.data?.textbookId) {
      await updateJobProgress(job.data.textbookId, 0, 'done', 'FAILED', err.message);
    }
  };
};

uploadWorker.on('failed', logFailure('uploadQueue'));
chapterWorker.on('failed', logFailure('chapterQueue'));
conceptWorker.on('failed', logFailure('conceptQueue'));
questionWorker.on('failed', logFailure('questionQueue'));
videoWorker.on('failed', logFailure('videoQueue'));
resourceWorker.on('failed', logFailure('resourceQueue'));
embeddingWorker.on('failed', logFailure('embeddingQueue'));

logger.info('BullMQ workers initialized and actively listening to queue channels.');
