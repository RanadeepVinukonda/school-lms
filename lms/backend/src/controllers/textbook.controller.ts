import { Request, Response } from 'express';
import * as textbookService from '../services/textbook.service';
import { sendSuccess, sendCreated, sendAccepted } from '../utils/response';
import { logger } from '../utils/logger';

import fs from 'fs/promises';

export async function createTextbook(req: Request, res: Response) {
  try {
    const result = await textbookService.createTextbook({
      ...req.body,
      pdfFilePath: req.file?.path,
      teacherId: req.user!.uid,
      teacherRole: req.user!.role,
      schoolId: req.user!.school_id,
    });
    sendAccepted(res, result, 'Textbook upload accepted — processing');
  } finally {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch((err) => {
        logger.warn('Failed to cleanup uploaded file after textbook creation', {
          filePath: req.file!.path,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }
}

export async function getTextbook(req: Request, res: Response) {
  const result = await textbookService.getTextbookById(req.params.textbookId, req.user);
  sendSuccess(res, result);
}

// List all textbooks (no filters)
export async function listTextbooks(req: Request, res: Response) {
  const result = await textbookService.listAllTextbooks(req.user!.school_id);
  sendSuccess(res, result);
}

// List chapters for a textbook
export async function listChapters(req: Request, res: Response) {
  const result = await textbookService.getChapters(req.params.textbookId, req.user);
  sendSuccess(res, result);
}

// List concepts for a chapter of a textbook
export async function listConcepts(req: Request, res: Response) {
  const result = await textbookService.getConcepts(req.params.textbookId, req.params.chapterId, req.user);
  sendSuccess(res, result);
}

export async function getTextbooksByClassAndSubject(req: Request, res: Response) {
  const result = await textbookService.getTextbooksByClassAndSubject(
    req.params.classId,
    req.params.subjectId,
    req.user!.school_id,
  );
  sendSuccess(res, result);
}

export async function deleteTextbook(req: Request, res: Response) {
  await textbookService.deleteTextbook(req.params.textbookId);
  sendSuccess(res, null, 'Textbook deleted');
}

export async function reprocessTextbook(req: Request, res: Response) {
  const result = await textbookService.reprocessTextbook(
    req.params.textbookId,
    req.user!.uid,
    req.user!.role
  );
  sendAccepted(res, result, 'Textbook reprocessing triggered');
}
