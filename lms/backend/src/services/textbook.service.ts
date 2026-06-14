/**
 * Textbook Service
 *
 * createTextbook():
 *   - Validates teacher is assigned to the class+subject (junction check)
 *   - Ensures only one textbook per class+subject (409 on conflict)
 *   - If pdfBuffer provided + Redis available: uploads to Cloudinary, sets
 *     status "processing", triggers AI pipeline via BullMQ
 *   - If pdfBuffer provided but no Redis: uploads to Cloudinary, sets status
 *     "ready", populates mock content immediately
 *   - If no pdfBuffer: populates mock content (dev/demo), status "ready"
 *
 * reprocessTextbook():
 *   - Validates status is "failed"
 *   - If Redis available: resets to "processing", re-triggers BullMQ pipeline
 *   - If no Redis: repopulates mock content, sets status "ready"
 */

import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { uploadBufferToCloudinary, deleteCloudinaryFile } from './cloudinary.service';
import { env } from '../config/env';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function populateMockContent(textbookId: string, textbookTitle: string): Promise<void> {
  const titleLower = textbookTitle.toLowerCase();
  let chapDetails: Array<{ title: string; concepts: string[] }>;

  if (titleLower.includes('math') || titleLower.includes('alg') || titleLower.includes('calc')) {
    chapDetails = [
      { title: 'Chapter 1: Quadratic Equations', concepts: ['Factoring Quadratics', 'Quadratic Formula'] },
      { title: 'Chapter 2: Trigonometry', concepts: ['Trig Ratios', 'Laws of Sines and Cosines'] },
    ];
  } else if (titleLower.includes('science') || titleLower.includes('phys') || titleLower.includes('chem')) {
    chapDetails = [
      { title: 'Chapter 1: Classical Mechanics', concepts: ['Newtonian Laws', 'Conservation of Momentum'] },
      { title: 'Chapter 2: Thermodynamics', concepts: ['First Law', 'Heat Transfer'] },
    ];
  } else {
    chapDetails = [
      { title: 'Chapter 1: Foundations', concepts: ['Core Concepts', 'Historical Context'] },
      { title: 'Chapter 2: Advanced Topics', concepts: ['Analytical Frameworks', 'Applications'] },
    ];
  }

  const textbookRef = collections.textbooks().doc(textbookId);

  for (let cIdx = 0; cIdx < chapDetails.length; cIdx++) {
    const chapInfo = chapDetails[cIdx];
    const chapId = uuidv4();
    const chapRef = textbookRef.collection('chapters').doc(chapId);

    await chapRef.set({
      id: chapId,
      title: chapInfo.title,
      order: cIdx + 1,
      summary: `Coverage of ${chapInfo.title}`,
    });

    for (let coIdx = 0; coIdx < chapInfo.concepts.length; coIdx++) {
      const conceptTitle = chapInfo.concepts[coIdx];
      const conceptId = uuidv4();

      const questionBank = [
        { id: uuidv4(), conceptId, type: 'mcq', difficulty: 'easy', text: `What is a key aspect of ${conceptTitle}?`, options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'Option A', points: 5 },
        { id: uuidv4(), conceptId, type: 'true_false', difficulty: 'easy', text: `${conceptTitle} is a fundamental concept.`, options: ['True', 'False'], correctAnswer: 'True', points: 2 },
        { id: uuidv4(), conceptId, type: 'fill_blank', difficulty: 'medium', text: `The study of ${conceptTitle} relies on ___.`, correctAnswer: 'theory', points: 5 },
        { id: uuidv4(), conceptId, type: 'matching', difficulty: 'medium', text: `Match terms in ${conceptTitle}.`, options: ['Term A - Def 1', 'Term B - Def 2', 'Term C - Def 3'], correctAnswer: 'Term A:Def 1|Term B:Def 2|Term C:Def 3', points: 8 },
        { id: uuidv4(), conceptId, type: 'numerical', difficulty: 'hard', text: `If the value for ${conceptTitle} is 5, what is double?`, correctAnswer: '10', points: 10 },
        { id: uuidv4(), conceptId, type: 'descriptive', difficulty: 'hots', text: `Analyze the significance of ${conceptTitle}.`, correctAnswer: 'Comprehensive analysis required.', points: 15 },
        { id: uuidv4(), conceptId, type: 'passage', difficulty: 'hots', text: `Based on the passage, what is the main idea about ${conceptTitle}?`, passageText: `${conceptTitle} is a vital concept that has evolved over time through research.`, options: ['It is static', 'It is dynamic', 'It is irrelevant', 'It is trivial'], correctAnswer: 'It is dynamic', points: 10 },
      ];

      await chapRef.collection('concepts').doc(conceptId).set({
        id: conceptId,
        title: conceptTitle,
        order: coIdx + 1,
        notes: `Study notes covering key rules and principles of ${conceptTitle}.`,
        videoLinks: [`https://www.youtube.com/results?search_query=${encodeURIComponent(conceptTitle)}`],
        questionBank: [],
      });

      const questionsColl = chapRef.collection('concepts').doc(conceptId).collection('questions');
      for (const q of questionBank) {
        await questionsColl.doc(q.id).set(q);
      }
    }
  }

  await textbookRef.update({ status: 'ready', chapterCount: chapDetails.length, updatedAt: new Date().toISOString() });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createTextbook(data: {
  title: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  description?: string;
  coverImage?: string;
  pdfBuffer?: Buffer;
}) {
  // Verify teacher assignment
  const assignmentSnap = await collections.teacherClassSubject()
    .where('teacherId', '==', data.teacherId)
    .where('classId', '==', data.classId)
    .where('subjectId', '==', data.subjectId)
    .limit(1)
    .get();

  if (assignmentSnap.empty) {
    throw new ForbiddenError('You are not assigned to teach this subject in this class');
  }
  const assignment = { id: assignmentSnap.docs[0].id, ...assignmentSnap.docs[0].data() } as Record<string, unknown>;

  // Prevent duplicates
  const existing = await collections.textbooks()
    .where('classId', '==', data.classId)
    .where('subjectId', '==', data.subjectId)
    .get();

  if (!existing.empty) {
    throw new ConflictError('A textbook already exists for this class and subject. Remove it first.');
  }

  const textbookId = uuidv4();
  const now = new Date().toISOString();
  let storagePath = '';
  let pdfUrl = '';
  let status: 'processing' | 'ready' = 'ready';

  if (data.pdfBuffer && data.pdfBuffer.length > 0) {
    // Upload PDF to Cloudinary
    const { url, publicId } = await uploadBufferToCloudinary(data.pdfBuffer, `textbooks/${textbookId}`);
    storagePath = publicId; // Store Cloudinary public ID as storagePath
    pdfUrl = url;
    // Only set processing if Redis is available (BullMQ queues are active)
    if (env.REDIS_URL) {
      status = 'processing';
    }
  }

  const textbookData = {
    id: textbookId,
    title: data.title,
    subjectId: data.subjectId,
    classId: data.classId,
    teacherId: data.teacherId,
    description: data.description || '',
    coverImage: data.coverImage || '',
    storagePath,
    pdfUrl, // Store Cloudinary URL for later download
    status,
    chapterCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await collections.textbooks().doc(textbookId).set(textbookData);

  if (status === 'processing') {
    // Trigger AI pipeline via BullMQ queue (requires Redis)
    try {
      const { addUploadJob } = require('../jobs/queue');
      await addUploadJob(textbookId, storagePath);
    } catch {
      // No Redis available — fall back to mock content so textbook is immediately usable
      logger.warn('BullMQ queue unavailable, populating mock content instead', { textbookId });
      status = 'ready';
      await populateMockContent(textbookId, data.title);
      await collections.textbooks().doc(textbookId).update({ status: 'ready', pdfUrl, storagePath });
    }
  } else {
    // No BullMQ (no Redis) or no PDF — populate mock content immediately
    await populateMockContent(textbookId, data.title);
  }

  // Update teacher-class-subject with textbookId
  if (assignment.id) {
    await collections.teacherClassSubject().doc(assignment.id as string).update({ textbookId, updatedAt: now });
  }

  logger.info('Textbook created', { textbookId, title: data.title, status });
  return textbookData;
}

export async function reprocessTextbook(textbookId: string, requestingTeacherId: string) {
  const ref = collections.textbooks().doc(textbookId);
  const doc = await ref.get();

  if (!doc.exists) throw new NotFoundError('Textbook not found');

  const data = doc.data()!;
  if (data.teacherId !== requestingTeacherId) throw new ForbiddenError('You do not own this textbook');
  if (data.status !== 'failed') throw new ConflictError(`Cannot reprocess textbook with status "${data.status}". Only "failed" textbooks can be reprocessed.`);
  if (!data.storagePath) throw new ConflictError('Textbook has no storagePath — cannot reprocess without an uploaded PDF.');

  if (env.REDIS_URL) {
    await ref.update({ status: 'processing', failureReason: null, updatedAt: new Date().toISOString() });
    const { addUploadJob } = require('../jobs/queue');
    await addUploadJob(textbookId, data.storagePath);
    logger.info('Textbook reprocessing triggered', { textbookId });
    return { textbookId, status: 'processing' };
  }

  // No Redis — repopulate mock content
  await populateMockContent(textbookId, data.title);
  await ref.update({ status: 'ready', failureReason: null, updatedAt: new Date().toISOString() });
  logger.info('Textbook reprocessed with mock content (no Redis)', { textbookId });
  return { textbookId, status: 'ready' };
}

export async function getTextbooksByClassAndSubject(classId: string, subjectId: string) {
  const snap = await collections.textbooks()
    .where('classId', '==', classId)
    .where('subjectId', '==', subjectId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAllTextbooks() {
  const snap = await collections.textbooks().get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getTextbookById(textbookId: string) {
  const doc = await collections.textbooks().doc(textbookId).get();
  if (!doc.exists) throw new NotFoundError('Textbook not found');
  return { id: doc.id, ...doc.data() };
}

export async function getChapters(textbookId: string) {
  const snap = await collections.textbooks().doc(textbookId).collection('chapters').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getConcepts(textbookId: string, chapterId: string) {
  const snap = await collections.textbooks()
    .doc(textbookId)
    .collection('chapters')
    .doc(chapterId)
    .collection('concepts')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteTextbook(textbookId: string) {
  const ref = collections.textbooks().doc(textbookId);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Textbook not found');
  // Delete PDF from Cloudinary if exists
  const data = doc.data();
  if (data?.storagePath) {
    await deleteCloudinaryFile(data.storagePath);
  }
  await ref.delete();
  logger.info('Textbook deleted', { textbookId });
}
