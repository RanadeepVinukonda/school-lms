import { Request, Response } from 'express';
import * as ocrService from '../services/ocr.service';
import { sendSuccess, sendError } from '../utils/response';
import { sendCreated } from '../utils/response';
import { logger } from '../utils/logger';
import { getCollection } from '../firebase/firestore';
import { AppError, ValidationError } from '../utils/errors';

export async function scanImage(req: Request, res: Response) {
  let imageBuffer: Buffer | null = null;

  if (req.file) {
    imageBuffer = req.file.buffer;
  } else if (req.body.image && typeof req.body.image === 'string') {
    const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(base64Data, 'base64');
  }

  if (!imageBuffer || imageBuffer.length === 0) {
    throw new ValidationError('No image provided. Send a base64 image in the body or upload a file.');
  }

  if (imageBuffer.length > 10 * 1024 * 1024) {
    throw new AppError(400, 'Image too large. Maximum size is 10MB.');
  }

  const result = await ocrService.extractText(imageBuffer);
  sendSuccess(res, result);
}

export async function mapToConcept(req: Request, res: Response) {
  const { text, textbookId, count } = req.body;

  if (!text || typeof text !== 'string') {
    throw new ValidationError('Text is required');
  }

  const questionCount = Math.min(Math.max(parseInt(count) || 5, 1), 20);

  // If textbookId is 'auto' or missing, generate questions directly from text
  if (!textbookId || textbookId === 'auto') {
    const questions = await ocrService.generateQuestionsFromText(text, 'Detected Content', questionCount);
    sendCreated(res, {
      conceptId: null,
      conceptName: 'Detected Content',
      questions,
    });
    return;
  }

  const chaptersSnap = await getCollection('textbooks').doc(textbookId).collection('chapters').get();
  const concepts: Array<{ id: string; title: string; summary: string }> = [];

  for (const chapterDoc of chaptersSnap.docs) {
    const conceptsSnap = await chapterDoc.ref.collection('concepts').get();
    conceptsSnap.docs.forEach((doc) => {
      const data = doc.data();
      concepts.push({
        id: doc.id,
        title: data.title || 'Untitled',
        summary: data.summary || '',
      });
    });
  }

  const mapping = await ocrService.mapTextToConcept(text, concepts);

  if (!mapping) {
    sendSuccess(res, {
      conceptId: null,
      conceptName: null,
      questions: [],
      message: 'Could not automatically map to a concept. Please select manually.',
    });
    return;
  }

  const questions = await ocrService.generateQuestionsFromText(text, mapping.conceptName, questionCount);

  sendCreated(res, {
    conceptId: mapping.conceptId,
    conceptName: mapping.conceptName,
    questions,
  });
}

export async function getConceptsForTextbook(req: Request, res: Response) {
  const { textbookId } = req.params;

  if (!textbookId) {
    throw new ValidationError('textbookId parameter is required');
  }

  const chaptersSnap = await getCollection('textbooks').doc(textbookId).collection('chapters').get();
  const allConcepts: Array<{ id: string; chapterId: string; chapterTitle: string; title: string; summary: string }> = [];

  for (const chapterDoc of chaptersSnap.docs) {
    const chapterData = chapterDoc.data();
    const conceptsSnap = await chapterDoc.ref.collection('concepts').get();
    conceptsSnap.docs.forEach((doc) => {
      const data = doc.data();
      allConcepts.push({
        id: doc.id,
        chapterId: chapterDoc.id,
        chapterTitle: chapterData.title || 'Untitled Chapter',
        title: data.title || 'Untitled',
        summary: data.summary || '',
      });
    });
  }

  sendSuccess(res, allConcepts);
}
