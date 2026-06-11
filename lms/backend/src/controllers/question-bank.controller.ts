import { Request, Response } from 'express';
import * as questionBankService from '../services/question-bank.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createQuestion(req: Request, res: Response) {
  const result = await questionBankService.createQuestion({ ...req.body, createdBy: req.user!.uid });
  sendCreated(res, result, 'Question created');
}

export async function bulkCreate(req: Request, res: Response) {
  const result = await questionBankService.bulkCreateQuestions(req.body.questions, req.user!.uid);
  sendCreated(res, result, `${result.length} questions created`);
}

export async function updateQuestion(req: Request, res: Response) {
  const result = await questionBankService.updateQuestion(req.params.id, req.user!.uid, req.body);
  sendSuccess(res, result, 'Question updated');
}

export async function deleteQuestion(req: Request, res: Response) {
  await questionBankService.deleteQuestion(req.params.id, req.user!.uid);
  sendSuccess(res, null, 'Question deleted');
}

export async function getQuestion(req: Request, res: Response) {
  const result = await questionBankService.getQuestion(req.params.id);
  sendSuccess(res, result);
}

export async function listQuestions(req: Request, res: Response) {
  const result = await questionBankService.listQuestions({ ...req.query } as any);
  sendSuccess(res, result);
}

export async function importFromConcept(req: Request, res: Response) {
  const { textbookId, chapterId, conceptId } = req.body;
  const result = await questionBankService.importFromConcept(textbookId, chapterId, conceptId, req.user!.uid);
  sendSuccess(res, result, `${result.imported} questions imported`);
}
