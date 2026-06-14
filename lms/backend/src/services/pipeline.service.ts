import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';
import { getAdminFirestore } from '../firebase/admin';
import { chatCompletion } from './ai.service';
import { getEmbedding } from './transformers.service';
import { searchAndRankVideos } from './video-ranker.service';
import { matchAndRankResources } from './resource-ranker.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const AI_MODEL = env.AI_MODEL;

async function processConcept(
  textbookId: string, chapterId: string, conceptId: string,
  conceptTitle: string, chapterTitle: string, fullText: string,
) {
  const db = getAdminFirestore();

  const matchingLines = fullText.split('\n')
    .filter((line) => line.toLowerCase().includes(conceptTitle.toLowerCase()))
    .slice(0, 8)
    .join('\n')
    .slice(0, 8000);
  const contextText = matchingLines || 'General educational context.';

  const textbookDoc = await db.collection('textbooks').doc(textbookId).get();
  const subjectId = textbookDoc.data()?.subjectId || '';
  const subjectDoc = subjectId ? await db.collection('subjects').doc(subjectId).get() : null;
  const subjectName = subjectDoc?.data()?.name || 'Education';

  const prompt = `You are an expert educational content creator for the concept "${conceptTitle}" (Chapter: "${chapterTitle}").

Generate ALL of the following in ONE JSON response:
1. summary — 2-3 sentence concept summary
2. notes — Detailed study notes (3+ paragraphs with principles, rules, explanations)
3. keyPoints — Bullet list of key terms and rules (4-6 items)
4. formulas — Formulas in LaTeX like $E=mc^2$ (if applicable, else empty string)
5. examples — Practical solved examples or applications (2-3 items)
6. learningObjectives — Bullet list of learning objectives (3-4 items)
7. questions — 3 questions for EACH of these 12 types (36 total): mcq, fill_blank, true_false, matching, descriptive, numerical, passage, assertion_reason, case_study, application_based, hots, short_answer

Return ONLY this JSON with no markdown:
{
  "summary": "", "notes": "", "keyPoints": "", "formulas": "", "examples": "", "learningObjectives": "",
  "questions": [
    { "question": "", "type": "mcq", "difficulty": "easy|medium|hard|hots", "options": ["A","B","C","D"], "answer": "", "explanation": "", "passageText": null }
  ]
}

Relevant textbook content:
${contextText}`;

  const errors: string[] = [];
  const reason = (r: PromiseSettledResult<any>) =>
    r.status === 'rejected' ? (r.reason?.message || String(r.reason)) : 'unknown';

  const [aiResult, videosResult, resourcesResult, embeddingResult] = await Promise.allSettled([
    chatCompletion({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: 'You respond in valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 16384,
    }).then((raw) => {
      const cleaned = raw.trim().replace(/^```json?/, '').replace(/```$/, '').trim();
      return JSON.parse(cleaned);
    }),

    searchAndRankVideos(conceptTitle, '', subjectName, 3),
    matchAndRankResources(conceptTitle, '', 3),

    (async () => {
      const text = `${conceptTitle}. ${contextText.slice(0, 500)}`.slice(0, 1000);
      return getEmbedding(text);
    })(),
  ]);

  if (aiResult.status === 'fulfilled' && aiResult.value) {
    const d = aiResult.value;
    await db.collection('conceptNotes').doc(conceptId).set({
      id: conceptId, conceptId, textbookId, chapterId,
      summary: d.summary || '', notes: d.notes || '', keyPoints: d.keyPoints || '',
      formulas: d.formulas || '', examples: d.examples || '', learningObjectives: d.learningObjectives || '',
      updatedAt: new Date().toISOString(),
    });

    if (Array.isArray(d.questions)) {
      const questionsColl = db.collection('conceptQuestions');
      for (const q of d.questions) {
        const qId = uuidv4();
        await questionsColl.doc(qId).set({
          id: qId, conceptId, textbookId, chapterId,
          question: q.question, type: q.type || 'mcq', difficulty: q.difficulty || 'medium',
          options: Array.isArray(q.options) ? q.options : null,
          answer: q.answer || '', explanation: q.explanation || '',
          passageText: q.passageText || null, createdAt: new Date().toISOString(),
        });
      }
      logger.info('Questions saved', { conceptId, count: d.questions.length });
    }
  } else {
    errors.push(`ai: ${reason(aiResult)}`);
  }

  if (videosResult.status === 'fulfilled' && Array.isArray(videosResult.value)) {
    const videosColl = db.collection('conceptVideos');
    const videoLinks: string[] = [];
    for (const v of videosResult.value) {
      const vId = uuidv4();
      await videosColl.doc(vId).set({
        id: vId, conceptId, textbookId, chapterId,
        videoId: v.youtubeId, title: v.title, description: v.description,
        channel: v.channelName, thumbnail: v.thumbnail, duration: v.duration,
        score: v.score || 1.0, embedding: v.embedding || null, createdAt: new Date().toISOString(),
      });
      videoLinks.push(v.embedUrl || `https://www.youtube.com/watch?v=${v.youtubeId}`);
    }
    await db.collection('textbooks').doc(textbookId)
      .collection('chapters').doc(chapterId)
      .collection('concepts').doc(conceptId)
      .update({ videoLinks });
  } else {
    errors.push(`videos: ${reason(videosResult)}`);
  }

  if (resourcesResult.status === 'fulfilled' && Array.isArray(resourcesResult.value)) {
    const resourcesColl = db.collection('conceptResources');
    for (const r of resourcesResult.value) {
      const rId = uuidv4();
      await resourcesColl.doc(rId).set({
        id: rId, conceptId, textbookId, chapterId,
        title: r.title, url: r.url, source: r.source, description: r.description,
        score: r.score || 1.0, embedding: r.embedding || null, createdAt: new Date().toISOString(),
      });
    }
  } else {
    errors.push(`resources: ${reason(resourcesResult)}`);
  }

  if (embeddingResult.status === 'fulfilled' && embeddingResult.value) {
    try {
      await db.collection('conceptNotes').doc(conceptId).update({ embedding: embeddingResult.value });
    } catch { /* conceptNotes doc may not exist if AI failed */ }
  } else {
    errors.push(`embedding: ${reason(embeddingResult)}`);
  }

  if (errors.length > 0) {
    logger.warn('Concept partial failures', { conceptId, errors: errors.join('; ') });
  }

  return errors.length === 0;
}

export async function processUploadInline(textbookId: string) {
  const db = getAdminFirestore();
  const textbookRef = db.collection('textbooks').doc(textbookId);
  const textbookDoc = await textbookRef.get();
  if (!textbookDoc.exists) throw new Error('Textbook not found');

  const pdfUrl = textbookDoc.data()?.pdfUrl;
  if (!pdfUrl) throw new Error('No PDF URL found for textbook');

  const title = textbookDoc.data()!.title || 'Textbook';

  await textbookRef.update({ status: 'processing' });

  // 1. Download PDF – single pass text extraction
  logger.info('Downloading and parsing PDF', { textbookId });
  const response = await fetch(pdfUrl);
  if (!response.ok) throw new Error(`Failed to download PDF: ${response.statusText}`);
  const pdfBuffer = Buffer.from(await response.arrayBuffer());

  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: pdfBuffer });
  let fullText = '';
  let pageCount = 0;
  try {
    const parsed = await parser.getText();
    fullText = parsed.text;
    pageCount = parsed.total || parsed.pages?.length || 0;
  } finally {
    await parser.destroy();
  }

  if (!fullText || fullText.trim().length === 0) {
    throw new Error('PDF yielded no readable text');
  }

  logger.info('PDF parsed', { textbookId, chars: fullText.length, pages: pageCount });

  await textbookRef.collection('rawPages').doc('full').set({
    text: fullText.slice(0, 100000),
    pageCount,
    createdAt: new Date().toISOString(),
  });

  // 2. Gemini TOC planning
  logger.info('Generating TOC structure', { textbookId });
  let structure: { chapters: Array<{ title: string; order: number; summary: string; concepts: string[] }> };

  try {
    const tocInput = fullText.slice(0, 80000);

    const tocPrompt = `You are analyzing a textbook titled "${title}". Your task is to extract the COMPLETE table of contents.

Look for the table of contents section in the text below. Find EVERY chapter listed in the textbook — do not skip any. For each chapter, also extract the subsections/concept names.

Rules:
- Extract ALL chapters. If the textbook has 15 chapters, return all 15.
- Use the ACTUAL chapter titles from the textbook — do not summarize or rename them.
- For each chapter, include 2-4 concept names based on what the chapter actually covers.
- If you cannot find an explicit table of contents, scan the headings and structure of the full text to infer chapters.

Return ONLY valid JSON:
{
  "chapters": [
    { "title": "Exact Chapter Title", "order": 1, "summary": "Brief description of what this chapter covers", "concepts": ["1.1 First Concept", "1.2 Second Concept"] }
  ]
}

Textbook content:
${tocInput}`;

    const raw = await chatCompletion({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: 'You respond in valid JSON only. Extract ALL chapters from the textbook content.' },
        { role: 'user', content: tocPrompt },
      ],
      temperature: 0.2,
      max_tokens: 16384,
    });
    const cleaned = raw.trim().replace(/^```json?/, '').replace(/```$/, '').trim();
    structure = JSON.parse(cleaned);

    logger.info('TOC extraction result', { textbookId, chapterCount: structure.chapters?.length || 0 });

    // If very few chapters returned, try again with more of the text
    if (structure.chapters.length <= 2 && fullText.length > 80000) {
      logger.warn('Only 2 or fewer chapters detected — retrying with full text', { textbookId });
      const retryPrompt = `I previously extracted only ${structure.chapters.length} chapters from "${title}", but this is wrong. The textbook has MANY more chapters.

Read the ENTIRE text below and extract EVERY chapter heading you can find. Look for patterns like "Chapter 1", "Chapter 2", "Unit 1", "Part I", numbered headings, or any section title.

Return JSON: { "chapters": [{ "title": string, "order": number, "summary": string, "concepts": [string] }] }

Full textbook text:
${fullText.slice(0, 120000)}`;

      const retryRaw = await chatCompletion({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: 'You respond in valid JSON only. Extract ALL chapters.' },
          { role: 'user', content: retryPrompt },
        ],
        temperature: 0.1,
        max_tokens: 16384,
      });

      const retryCleaned = retryRaw.trim().replace(/^```json?/, '').replace(/```$/, '').trim();
      const retryStructure = JSON.parse(retryCleaned);

      if (retryStructure.chapters && retryStructure.chapters.length > structure.chapters.length) {
        structure = retryStructure;
        logger.info('Retry found more chapters', { textbookId, chapterCount: structure.chapters.length });
      }
    }
  } catch (err) {
    logger.error('TOC generation failed, using fallback', { err });
    structure = {
      chapters: [
        { title: 'Chapter 1: Core Concepts', order: 1, summary: 'Foundational topics.', concepts: ['1.1 Introduction', '1.2 Key Principles'] },
        { title: 'Chapter 2: Advanced Topics', order: 2, summary: 'In-depth coverage.', concepts: ['2.1 Advanced Theory', '2.2 Practical Applications'] },
      ],
    };
  }

  if (!structure.chapters || structure.chapters.length === 0) {
    throw new Error('Failed to generate chapter structure');
  }

  // 3. Save chapters + concepts
  const oldChaps = await textbookRef.collection('chapters').get();
  for (const d of oldChaps.docs) await d.ref.delete();

  const chapters: Array<{ id: string; title: string }> = [];
  let totalConcepts = 0;

  for (const chap of structure.chapters) {
    const chapterId = uuidv4();
    chapters.push({ id: chapterId, title: chap.title });

    await textbookRef.collection('chapters').doc(chapterId).set({
      id: chapterId, title: chap.title, order: chap.order || totalConcepts + 1, summary: chap.summary || '',
    });

    for (let cIdx = 0; cIdx < chap.concepts.length; cIdx++) {
      totalConcepts++;
      const conceptId = uuidv4();
      await textbookRef.collection('chapters').doc(chapterId)
        .collection('concepts').doc(conceptId).set({
          id: conceptId, title: chap.concepts[cIdx], order: cIdx + 1,
        });
    }
  }

  await textbookRef.update({
    chapterCount: structure.chapters.length,
    totalConcepts,
    updatedAt: new Date().toISOString(),
  });

  logger.info('Structure saved', { textbookId, chapters: chapters.length, totalConcepts });

  // 4. Process concepts in batches of 2 (parallel within batch)
  let completedCount = 0;

  for (const chap of chapters) {
    const conceptsSnap = await textbookRef.collection('chapters').doc(chap.id).collection('concepts').get();
    const conceptDocs = conceptsSnap.docs;

    for (let i = 0; i < conceptDocs.length; i += 2) {
      const batch = conceptDocs.slice(i, i + 2);
      const results = await Promise.allSettled(
        batch.map((doc) => {
          const d = doc.data();
          return processConcept(textbookId, chap.id, doc.id, d.title, chap.title, fullText);
        }),
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          completedCount++;
          await textbookRef.update({
            completedConcepts: admin.firestore.FieldValue.increment(1),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  // 5. Finalize
  await textbookRef.update({ status: 'ready', updatedAt: new Date().toISOString() });

  logger.info('Textbook processing complete', { textbookId, totalConcepts, completedCount });
}
