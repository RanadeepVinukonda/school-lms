import { Request, Response } from 'express';
import * as textbookService from '../services/textbook.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createTextbook(req: Request, res: Response) {
  const result = await textbookService.createTextbook({
    ...req.body,
    pdfBuffer: req.file?.buffer,
    teacherId: req.user!.uid,
    teacherRole: req.user!.role,
  });
  sendCreated(res, result, 'Textbook created');
}

export async function getTextbook(req: Request, res: Response) {
  const result = await textbookService.getTextbookById(req.params.textbookId);
  sendSuccess(res, result);
}

// List all textbooks (no filters)
export async function listTextbooks(req: Request, res: Response) {
  const result = await textbookService.listAllTextbooks();
  sendSuccess(res, result);
}

// List chapters for a textbook
export async function listChapters(req: Request, res: Response) {
  const result = await textbookService.getChapters(req.params.textbookId);
  sendSuccess(res, result);
}

// List concepts for a chapter of a textbook
export async function listConcepts(req: Request, res: Response) {
  const result = await textbookService.getConcepts(req.params.textbookId, req.params.chapterId);
  sendSuccess(res, result);
}

export async function getTextbooksByClassAndSubject(req: Request, res: Response) {
  const result = await textbookService.getTextbooksByClassAndSubject(
    req.params.classId,
    req.params.subjectId,
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
    req.user!.uid
  );
  sendSuccess(res, result, 'Textbook reprocessing triggered');
}
