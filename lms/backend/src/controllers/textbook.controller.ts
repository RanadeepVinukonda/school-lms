import { Request, Response } from 'express';
import * as textbookService from '../services/textbook.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createTextbook(req: Request, res: Response) {
  const result = await textbookService.createTextbook({
    ...req.body,
    teacherId: req.user!.uid,
  });
  sendCreated(res, result, 'Textbook created');
}

export async function getTextbook(req: Request, res: Response) {
  const result = await textbookService.getTextbookById(req.params.textbookId);
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
